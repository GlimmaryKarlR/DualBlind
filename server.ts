import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// In-memory store for benchmark run history and leaderboard records
interface SavedRunRecord {
  id: string;
  problemId: string;
  problemTitle: string;
  topic: string;
  difficulty: string;
  date: string;
  agentAConfig: { name: string; model: string };
  agentBConfig: { name: string; model: string };
  isUncapped?: boolean;
  turnsCount: number;
  totalTokens: number;
  totalInputTokens?: number;
  totalOutputTokens?: number;
  totalCostUsd: number;
  totalWallClockMs: number;
  tokensPerSec: number;
  consensusReached: boolean;
  finalAgreedAnswer: string | null;
  accuracyScore: number;
  isCorrect: boolean;
  efficiencyIndex: number;
  teamFunctionality?: string;
  consensusStatus?: string;
  turnsSummary: Array<{ sender: string; latencyMs: number; tokens: number; costUsd?: number; claim: string | null }>;
}

const savedBenchmarkRuns: SavedRunRecord[] = [];

// Lazy initialization of GoogleGenAI
function getGenAI(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is missing.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Regex to extract FINAL ANSWER: [xxx]
function extractFinalAnswer(text: string): string | null {
  if (!text) return null;
  // Match FINAL ANSWER:\s*\[(.*?)\] (case-insensitive)
  const bracketMatch = text.match(/FINAL\s+ANSWER\s*:\s*\[(.*?)\]/i);
  if (bracketMatch && bracketMatch[1]) {
    return bracketMatch[1].trim();
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

// Normalizer for text comparisons
function normalizeAnswerString(str: string): string {
  return str
    .toLowerCase()
    .replace(/[$\\,\\.\\[\\]\\(\\)\\*\\_\\"\\']/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Calculate dollar cost based on Gemini pricing
function calculateInferenceCost(inputTokens: number, outputTokens: number): number {
  const inputCost = (inputTokens * 0.15) / 1_000_000;
  const outputCost = (outputTokens * 0.60) / 1_000_000;
  return inputCost + outputCost;
}

// Check correctness
function evaluateCorrectness(
  submittedAnswer: string | null,
  groundTruthList: string[],
  requiredKeywords?: string[]
): { isCorrect: boolean; accuracyScore: number; notes: string } {
  if (!submittedAnswer || submittedAnswer.trim() === '') {
    return {
      isCorrect: false,
      accuracyScore: 0,
      notes: 'No final answer provided.',
    };
  }

  const normalizedSubmitted = normalizeAnswerString(submittedAnswer);

  // 1. Direct or normalized alias matching
  for (const truth of groundTruthList) {
    const normalizedTruth = normalizeAnswerString(truth);
    if (
      normalizedSubmitted === normalizedTruth ||
      normalizedSubmitted.includes(normalizedTruth) ||
      normalizedTruth.includes(normalizedSubmitted)
    ) {
      return {
        isCorrect: true,
        accuracyScore: 100,
        notes: `Exact/normalized match against ground truth '${truth}'.`,
      };
    }
  }

  // 2. Keyword verification if specified
  if (requiredKeywords && requiredKeywords.length > 0) {
    const allKeywordsMatched = requiredKeywords.every((kw) =>
      normalizedSubmitted.includes(normalizeAnswerString(kw))
    );
    if (allKeywordsMatched) {
      return {
        isCorrect: true,
        accuracyScore: 100,
        notes: `Matched all required domain keywords: [${requiredKeywords.join(', ')}].`,
      };
    }
    const matchedCount = requiredKeywords.filter((kw) =>
      normalizedSubmitted.includes(normalizeAnswerString(kw))
    ).length;
    if (matchedCount > 0) {
      const partialScore = Math.round((matchedCount / requiredKeywords.length) * 80);
      return {
        isCorrect: false,
        accuracyScore: partialScore,
        notes: `Partial match: ${matchedCount}/${requiredKeywords.length} key components verified.`,
      };
    }
  }

  // 3. Numeric extraction fallback (e.g. if answer is a pure number like 7 or 1330)
  const submittedNumbers = normalizedSubmitted.match(/\\d+(\\.\\d+)?/g);
  for (const truth of groundTruthList) {
    const truthNumbers = normalizeAnswerString(truth).match(/\\d+(\\.\\d+)?/g);
    if (
      submittedNumbers &&
      truthNumbers &&
      submittedNumbers.length === truthNumbers.length &&
      submittedNumbers.every((n, i) => Math.abs(parseFloat(n) - parseFloat(truthNumbers[i])) < 0.001)
    ) {
      return {
        isCorrect: true,
        accuracyScore: 100,
        notes: `Numerical equality match: ${submittedNumbers.join(', ')}.`,
      };
    }
  }

  return {
    isCorrect: false,
    accuracyScore: 0,
    notes: `Answer '${submittedAnswer}' did not match ground truth expectations.`,
  };
}

// -------------------------------------------------------------
// API Endpoints
// -------------------------------------------------------------

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// Generate next conversation turn for an agent
app.post('/api/benchmark/generate-turn', async (req, res) => {
  const startTime = Date.now();
  try {
    const { problem, agent, partnerName, history, currentTurn, isUncapped, maxTurnsPerAgent } = req.body;

    if (!problem || !agent) {
      return res.status(400).json({ error: 'Missing required problem or agent data' });
    }

    const ai = getGenAI();

    // Dual-blind prompt engineering:
    // The model is told it is interacting with a human collaborator on a real-time puzzle challenge.
    // In uncapped mode, there is NO turn ceiling — the benchmark evaluates how long and how much it costs
    // to reach true consensus without looping into an infinite token burn.
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

    // Construct conversation history for the prompt
    const contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];

    // The initial prompt sets up the challenge
    let initialUserPrompt = `[BENCHMARK CHALLENGE - TOPIC: ${problem.topic.toUpperCase()}]
Title: ${problem.title}
Difficulty: ${problem.difficulty}

Problem Statement:
${problem.question}

${partnerName} and you should now discuss this problem and reach a definitive final answer in the format: ${problem.expectedFormat}.`;

    contents.push({
      role: 'user',
      parts: [{ text: initialUserPrompt }],
    });

    // Add prior turn history
    if (Array.isArray(history) && history.length > 0) {
      for (const item of history) {
        if (item.isCurrentAgent) {
          contents.push({
            role: 'model',
            parts: [{ text: item.text }],
          });
        } else {
          contents.push({
            role: 'user',
            parts: [{ text: `${item.sender}: ${item.text}` }],
          });
        }
      }
    } else {
      // First turn of the conversation
      contents.push({
        role: 'user',
        parts: [{ text: `Hello ${agent.name}, let's solve this challenge together. What are your initial thoughts or calculation steps on this problem?` }],
      });
    }

    const modelName = agent.model || 'gemini-3.7-flash';

    const response = await ai.models.generateContent({
      model: modelName,
      contents: contents,
      config: {
        systemInstruction,
        temperature: agent.temperature ?? 0.4,
      },
    });

    const endTime = Date.now();
    const latencyMs = endTime - startTime;

    const responseText = response.text || '';
    const extractedAnswer = extractFinalAnswer(responseText);

    const usage = response.usageMetadata;
    const inputTokens = usage?.promptTokenCount || Math.round(JSON.stringify(contents).length / 4);
    const outputTokens = usage?.candidatesTokenCount || Math.round(responseText.length / 4);
    const totalTokens = usage?.totalTokenCount || (inputTokens + outputTokens);
    const costUsd = calculateInferenceCost(inputTokens, outputTokens);

    res.json({
      content: responseText,
      extractedFinalAnswer: extractedAnswer,
      inputTokens,
      outputTokens,
      totalTokens,
      costUsd,
      latencyMs,
    });
  } catch (error: any) {
    console.error('Error generating benchmark turn:', error);
    const latencyMs = Date.now() - startTime;
    res.status(500).json({
      error: error.message || 'Failed to generate agent response',
      latencyMs,
    });
  }
});

// Ground-truth verification and Efficiency Index computation
app.post('/api/benchmark/verify', (req, res) => {
  try {
    const {
      problem,
      finalAnswerA,
      finalAnswerB,
      totalTokens,
      totalInputTokens,
      totalOutputTokens,
      totalWallClockMs,
      consensusReached,
      turnsCount,
      isInfiniteLoop,
    } = req.body;

    if (!problem) {
      return res.status(400).json({ error: 'Missing problem definition' });
    }

    const evaluatedAnswer = finalAnswerA || finalAnswerB || 'None';

    const { isCorrect, accuracyScore, notes } = evaluateCorrectness(
      evaluatedAnswer,
      problem.groundTruth || [],
      problem.requiredKeywords
    );

    const inputToks = totalInputTokens || Math.round((totalTokens || 100) * 0.6);
    const outputToks = totalOutputTokens || Math.round((totalTokens || 100) * 0.4);
    const totalCostUsd = calculateInferenceCost(inputToks, outputToks);

    const wallClockSec = Math.max(0.2, (totalWallClockMs || 1000) / 1000);
    const tokensCount = Math.max(10, totalTokens || 100);

    const consensusFactor = isInfiniteLoop
      ? 0.0
      : consensusReached
      ? 1.0
      : (finalAnswerA || finalAnswerB ? 0.5 : 0.0);

    const effectiveAccuracy = accuracyScore * consensusFactor;

    // Cost-to-Consensus Efficiency Index Formula:
    // Efficiency = (Accuracy Score [0-100] * Consensus Factor) / (Wall Clock Time in Seconds * Total Tokens Generated) * 10,000
    // If the team failed to converge or entered an infinite token burn loop, score drops to 0.
    const rawEfficiency = isInfiniteLoop
      ? 0
      : (effectiveAccuracy / (wallClockSec * tokensCount)) * 10000;
    const efficiencyIndex = Math.round(rawEfficiency * 100) / 100;

    // Determine Team Functionality Verdict
    let teamVerdict = 'Functional';
    if (isInfiniteLoop) {
      teamVerdict = 'Non-Functional (Infinite Token Burn Loop)';
    } else if (!consensusReached) {
      teamVerdict = 'Non-Functional (Failed to Reach Consensus)';
    } else if (!isCorrect) {
      teamVerdict = 'Non-Functional (Consensus on Wrong Answer)';
    } else if (turnsCount <= 4) {
      teamVerdict = 'Highly Functional & Cost-Optimal (<5 Turns)';
    } else if (turnsCount <= 8) {
      teamVerdict = 'Functional Team (Standard Convergence)';
    } else {
      teamVerdict = 'Functional (High Compute Overhead)';
    }

    res.json({
      isCorrect,
      accuracyScore,
      evaluatedAnswer,
      canonicalAnswer: problem.canonicalAnswer || problem.groundTruth[0],
      explanation: problem.explanation,
      verificationNotes: notes,
      efficiencyIndex,
      totalCostUsd,
      consensusFactor,
      wallClockSec,
      tokensCount,
      teamVerdict,
    });
  } catch (error: any) {
    console.error('Error verifying benchmark:', error);
    res.status(500).json({ error: error.message || 'Failed to verify benchmark' });
  }
});

// Save a benchmark run into the records store
app.post('/api/benchmark/save-run', (req, res) => {
  try {
    const record: SavedRunRecord = {
      id: req.body.id || `run-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      problemId: req.body.problemId,
      problemTitle: req.body.problemTitle,
      topic: req.body.topic,
      difficulty: req.body.difficulty,
      date: req.body.date || new Date().toISOString(),
      agentAConfig: req.body.agentAConfig,
      agentBConfig: req.body.agentBConfig,
      isUncapped: req.body.isUncapped ?? true,
      turnsCount: req.body.turnsCount,
      totalTokens: req.body.totalTokens,
      totalInputTokens: req.body.totalInputTokens,
      totalOutputTokens: req.body.totalOutputTokens,
      totalCostUsd: req.body.totalCostUsd || calculateInferenceCost(req.body.totalTokens * 0.6, req.body.totalTokens * 0.4),
      totalWallClockMs: req.body.totalWallClockMs,
      tokensPerSec: req.body.tokensPerSec,
      consensusReached: req.body.consensusReached,
      finalAgreedAnswer: req.body.finalAgreedAnswer,
      accuracyScore: req.body.accuracyScore,
      isCorrect: req.body.isCorrect,
      efficiencyIndex: req.body.efficiencyIndex,
      teamFunctionality: req.body.teamFunctionality,
      consensusStatus: req.body.consensusStatus,
      turnsSummary: req.body.turnsSummary || [],
    };

    savedBenchmarkRuns.unshift(record);
    if (savedBenchmarkRuns.length > 150) {
      savedBenchmarkRuns.pop();
    }

    res.json({ success: true, savedRecord: record });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to save benchmark run' });
  }
});

// Get leaderboard and run statistics
app.get('/api/benchmark/leaderboard', (req, res) => {
  res.json({
    runs: savedBenchmarkRuns,
    totalRuns: savedBenchmarkRuns.length,
  });
});

// -------------------------------------------------------------
// Vite Server Integration
// -------------------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`DualBlind AI Benchmark Server running on http://localhost:${PORT}`);
  });
}

startServer();
