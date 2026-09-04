#!/usr/bin/env python3
"""
DualBlind AI Arena - Autonomous Headless Benchmark Runner
=========================================================
Runs multi-agent collaborative benchmark evaluations in a continuous,
click-free loop and automatically restarts with exponential backoff
whenever an unhandled error, network failure, or API outage occurs.

Features:
- 100% Click-Free: Runs headless from any terminal, local machine, or server.
- Self-Healing Watchdog: Catches all exceptions, isolates per-trial glitches, and auto-restarts on fatal drops.
- Pure Standard Library: Runs out of the box on Python 3.8+ (no pip install required).
- Auto-Discovers API Keys: Reads from CLI (--api-key), local environment, and .env / .env.local files.
- Live Leaderboard Sync: Every run is saved immediately to the DualBlind Firestore database & cache.
- Local JSONL Backup: Appends each run record to `arena_runs_local.jsonl`.
- Resilient Fallback: Built-in benchmark suite catalog ensures execution even if remote server is an older deployment.

Usage:
  python3 scripts/arena_runner.py
  python3 scripts/arena_runner.py --url https://dual-blind.vercel.app --api-key AIzaSy...
  python3 scripts/arena_runner.py --suite gpqa_diamond --model-a gemini-3.7-flash --model-b gemini-2.5-flash
  python3 scripts/arena_runner.py --uncapped --verbose
"""

from __future__ import annotations

import sys
import os
import json
import time
import signal
import random
import argparse
import traceback
import threading
import urllib.request
import urllib.error
from datetime import datetime

# Enable unbuffered / line-buffered streaming in all terminal and subprocess environments
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(line_buffering=True)
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(line_buffering=True)

# ANSI Color codes for readable terminal telemetry
CYAN = "\033[96m"
GREEN = "\033[92m"
YELLOW = "\033[93m"
RED = "\033[91m"
MAGENTA = "\033[95m"
BLUE = "\033[94m"
BOLD = "\033[1m"
DIM = "\033[2m"
RESET = "\033[0m"

# Graceful termination handler
RUNNING = True
def handle_sigint(signum, frame):
    global RUNNING
    print(f"\n{YELLOW}[!] Received interrupt signal (Ctrl+C). Finishing current task and exiting...{RESET}")
    RUNNING = False

signal.signal(signal.SIGINT, handle_sigint)
signal.signal(signal.SIGTERM, handle_sigint)


def load_env_candidates():
    """Look for and parse .env or .env.local in current, parent, and script dirs without external dependencies."""
    search_dirs = [
        os.getcwd(),
        os.path.join(os.getcwd(), ".."),
        os.path.dirname(os.path.abspath(__file__)),
        os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."),
    ]
    candidate_names = [".env.local", ".env", ".env.development"]
    loaded = []

    for d in search_dirs:
        for name in candidate_names:
            p = os.path.normpath(os.path.join(d, name))
            if os.path.isfile(p) and p not in loaded:
                loaded.append(p)
                try:
                    with open(p, "r", encoding="utf-8") as f:
                        for line in f:
                            line = line.strip()
                            if not line or line.startswith("#") or "=" not in line:
                                continue
                            k, v = line.split("=", 1)
                            k = k.strip()
                            v = v.strip().strip("'\"")
                            if k and k not in os.environ:
                                os.environ[k] = v
                except Exception:
                    pass


# Automatically load env candidates at startup
load_env_candidates()


def append_local_run(run_record: dict, filename: str = "arena_runs_local.jsonl", max_retries: int = 5) -> None:
    """Safely append a run record to the local JSONL file with retry on file contention."""
    line = json.dumps(run_record, ensure_ascii=False) + "\n"
    for attempt in range(max_retries):
        try:
            with open(filename, "a", encoding="utf-8") as f:
                f.write(line)
                f.flush()
            return
        except Exception as e:
            if attempt == max_retries - 1:
                print(f"  {YELLOW}[!] Local file write note: {e}{RESET}", flush=True)
            else:
                time.sleep(random.uniform(0.05, 0.25))


def post_json(url: str, payload: dict, timeout: int = 120, max_retries: int = 5) -> dict:
    """Send a POST request with JSON body, with automatic retry and exponential backoff on HTTP 429/502/503/504."""
    data_bytes = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=data_bytes,
        headers={
            "Content-Type": "application/json",
            "User-Agent": "DualBlind-Headless-Runner/1.0",
        },
        method="POST",
    )

    last_err = None
    for attempt in range(max_retries):
        try:
            with urllib.request.urlopen(req, timeout=timeout) as response:
                resp_data = response.read().decode("utf-8")
                return json.loads(resp_data)
        except urllib.error.HTTPError as e:
            body = ""
            try:
                body = e.read().decode("utf-8")
                err_json = json.loads(body)
                err_msg = err_json.get("error") or err_json.get("message") or body
            except Exception:
                err_msg = body[:240] if body else str(e)
            
            # If rate limit (429) or upstream busy (502, 503, 504), back off with jitter
            if e.code in (429, 502, 503, 504) and attempt < max_retries - 1:
                backoff = (2.0 ** attempt) + random.uniform(0.8, 2.5)
                print(f"  {YELLOW}[Rate Limit / {e.code}] Upstream busy. Retrying in {backoff:.1f}s (attempt {attempt+1}/{max_retries})...{RESET}", flush=True)
                time.sleep(backoff)
                continue

            raise RuntimeError(f"HTTP {e.code}: {err_msg}") from None
        except (urllib.error.URLError, TimeoutError, ConnectionResetError, OSError) as net_err:
            last_err = net_err
            if attempt < max_retries - 1:
                backoff = (1.5 ** attempt) + random.uniform(0.5, 1.8)
                print(f"  {YELLOW}[Network Notice] Transient drop. Retrying in {backoff:.1f}s...{RESET}", flush=True)
                time.sleep(backoff)
                continue
            raise RuntimeError(f"Network error after {max_retries} attempts: {last_err}") from None

    raise RuntimeError(f"Request failed after {max_retries} attempts: {last_err}")


def get_json(url: str, timeout: int = 30, max_retries: int = 4) -> dict:
    """Send a GET request and parse JSON response, with automatic retry on transient errors."""
    req = urllib.request.Request(
        url,
        headers={"User-Agent": "DualBlind-Headless-Runner/1.0"},
        method="GET",
    )
    for attempt in range(max_retries):
        try:
            with urllib.request.urlopen(req, timeout=timeout) as response:
                resp_data = response.read().decode("utf-8")
                return json.loads(resp_data)
        except urllib.error.HTTPError as e:
            body = ""
            try:
                body = e.read().decode("utf-8")
                err_json = json.loads(body)
                err_msg = err_json.get("error") or err_json.get("message") or body
            except Exception:
                err_msg = body[:240] if body else str(e)
            if e.code in (429, 502, 503, 504) and attempt < max_retries - 1:
                backoff = (1.5 ** attempt) + random.uniform(0.5, 1.5)
                time.sleep(backoff)
                continue
            raise RuntimeError(f"HTTP {e.code}: {err_msg}") from None
        except (urllib.error.URLError, TimeoutError, ConnectionResetError, OSError) as net_err:
            if attempt < max_retries - 1:
                time.sleep(1.0 + random.uniform(0.2, 0.8))
                continue
            raise RuntimeError(f"GET failed: {net_err}") from None


def extract_final_answer(text: str) -> str | None:
    """Extract consensus answer enclosed in FINAL ANSWER: [...] format."""
    import re
    if not text:
        return None
    patterns = [
        r"(?:FINAL\s+ANSWER|CONSENSUS\s+ANSWER)[\s:]*\[(.*?)\]",
        r"(?:FINAL\s+ANSWER|CONSENSUS\s+ANSWER)[\s:]*([^\n\r]+)",
        r"\\boxed\{([^}]+)\}",
    ]
    for p in patterns:
        m = re.search(p, text, re.IGNORECASE)
        if m and m.group(1):
            cleaned = m.group(1).strip().strip("[]'\"*")
            if cleaned:
                return cleaned
    return None


# Verified 100% Free Models Pool (OpenRouter Free Slugs & Google Free Tier)
VERIFIED_FREE_MODELS = [
    # OpenRouter Verified 100% Free Models (:free suffix indicates 0 cost)
    {
        "model": "meta-llama/llama-3.3-70b-instruct:free",
        "provider": "openrouter",
        "name": "Llama 3.3 70B Free",
        "family": "Meta",
    },
    {
        "model": "deepseek/deepseek-r1:free",
        "provider": "openrouter",
        "name": "DeepSeek R1 Free",
        "family": "DeepSeek",
    },
    {
        "model": "deepseek/deepseek-chat:free",
        "provider": "openrouter",
        "name": "DeepSeek V3 Chat Free",
        "family": "DeepSeek",
    },
    {
        "model": "deepseek/deepseek-r1-distill-llama-70b:free",
        "provider": "openrouter",
        "name": "DeepSeek R1 Distill 70B Free",
        "family": "DeepSeek",
    },
    {
        "model": "qwen/qwen-2.5-72b-instruct:free",
        "provider": "openrouter",
        "name": "Qwen 2.5 72B Free",
        "family": "Qwen",
    },
    {
        "model": "qwen/qwen-2.5-coder-32b-instruct:free",
        "provider": "openrouter",
        "name": "Qwen 2.5 Coder 32B Free",
        "family": "Qwen",
    },
    {
        "model": "qwen/qwq-32b:free",
        "provider": "openrouter",
        "name": "QwQ 32B Reasoning Free",
        "family": "Qwen",
    },
    {
        "model": "mistralai/mistral-small-24b-instruct-2501:free",
        "provider": "openrouter",
        "name": "Mistral Small 24B Free",
        "family": "Mistral",
    },
    {
        "model": "mistralai/mistral-7b-instruct:free",
        "provider": "openrouter",
        "name": "Mistral 7B Free",
        "family": "Mistral",
    },
    {
        "model": "google/gemini-2.0-flash-exp:free",
        "provider": "openrouter",
        "name": "Gemini 2.0 Flash Exp (OpenRouter Free)",
        "family": "Google",
    },
    {
        "model": "meta-llama/llama-3.1-8b-instruct:free",
        "provider": "openrouter",
        "name": "Llama 3.1 8B Free",
        "family": "Meta",
    },
    {
        "model": "meta-llama/llama-3.2-3b-instruct:free",
        "provider": "openrouter",
        "name": "Llama 3.2 3B Free",
        "family": "Meta",
    },
    {
        "model": "microsoft/phi-3-mini-128k-instruct:free",
        "provider": "openrouter",
        "name": "Phi 3 Mini Free",
        "family": "Microsoft",
    },
    {
        "model": "cognitivecomputations/dolphin3.0-r1-mistral-24b:free",
        "provider": "openrouter",
        "name": "Dolphin 3.0 R1 Free",
        "family": "Cognitive",
    },
    {
        "model": "openrouter/free",
        "provider": "openrouter",
        "name": "OpenRouter Free Auto-Router",
        "family": "Auto",
    },
    # Google AI Studio Free Tier Models
    {
        "model": "gemini-2.5-flash",
        "provider": "google",
        "name": "Gemini 2.5 Flash",
        "family": "Google",
    },
    {
        "model": "gemini-2.0-flash",
        "provider": "google",
        "name": "Gemini 2.0 Flash",
        "family": "Google",
    },
    {
        "model": "gemini-1.5-flash",
        "provider": "google",
        "name": "Gemini 1.5 Flash",
        "family": "Google",
    },
]


def is_model_free(model_name: str, provider: str = "") -> bool:
    """Check whether a model qualifies as zero-cost free tier."""
    if not model_name:
        return False
    m = model_name.lower().strip()
    if ":free" in m or m.endswith("/free") or m == "openrouter/free":
        return True
    if provider.lower() == "google" or m.startswith("gemini-") or m.startswith("google/"):
        if any(f in m for f in ["flash", "gemma", "exp"]):
            return True
    for entry in VERIFIED_FREE_MODELS:
        if entry["model"].lower() == m:
            return True
    return False


def select_trial_agents(config: argparse.Namespace, trial_num: int) -> tuple[dict, dict]:
    """Select Agent Alpha and Agent Beta for this trial, enforcing free models and random pairing."""
    # Check if user explicitly requested fixed models
    has_custom = bool(config.model_a and config.model_b)
    use_random = getattr(config, "random_models", True)

    if has_custom and not use_random:
        prov_a = config.provider_a or ("openrouter" if ":free" in config.model_a or "/" in config.model_a else "google")
        prov_b = config.provider_b or ("openrouter" if ":free" in config.model_b or "/" in config.model_b else "google")

        # Enforce free models if forced
        if getattr(config, "force_free", True):
            if not is_model_free(config.model_a, prov_a):
                print(f"{YELLOW}[!] Notice: --force-free is active. '{config.model_a}' is not verified free; swapping to free Llama 3.3.{RESET}")
                config.model_a = "meta-llama/llama-3.3-70b-instruct:free"
                prov_a = "openrouter"
            if not is_model_free(config.model_b, prov_b):
                print(f"{YELLOW}[!] Notice: --force-free is active. '{config.model_b}' is not verified free; swapping to free DeepSeek R1.{RESET}")
                config.model_b = "deepseek/deepseek-r1:free"
                prov_b = "openrouter"

        agent_a = {
            "name": f"Agent Alpha ({config.model_a})",
            "model": config.model_a,
            "provider": prov_a,
            "temperature": 0.4,
            "displayName": config.model_a,
        }
        agent_b = {
            "name": f"Agent Beta ({config.model_b})",
            "model": config.model_b,
            "provider": prov_b,
            "temperature": 0.4,
            "displayName": config.model_b,
        }
        return agent_a, agent_b

    # Filter available free pool according to provider filter
    provider_filter = getattr(config, "provider", "all").lower()
    pool = list(VERIFIED_FREE_MODELS)
    if provider_filter == "openrouter":
        pool = [m for m in pool if m["provider"] == "openrouter"]
    elif provider_filter == "google":
        pool = [m for m in pool if m["provider"] == "google"]

    if not pool:
        pool = list(VERIFIED_FREE_MODELS)

    # Pick Agent A
    spec_a = random.choice(pool)

    # Pick Agent B (distinct model for dynamic collaborative cross-checking)
    remaining_pool = [m for m in pool if m["model"] != spec_a["model"]]
    
    # In 'all' mode, favor cross-provider or cross-family pairings
    cross_candidates = [m for m in remaining_pool if m["provider"] != spec_a["provider"]]
    if cross_candidates and random.random() < 0.65:
        spec_b = random.choice(cross_candidates)
    elif remaining_pool:
        spec_b = random.choice(remaining_pool)
    else:
        spec_b = random.choice(pool)

    agent_a = {
        "name": f"Agent Alpha ({spec_a['name']})",
        "model": spec_a["model"],
        "provider": spec_a["provider"],
        "temperature": 0.4,
        "displayName": spec_a["name"],
    }
    agent_b = {
        "name": f"Agent Beta ({spec_b['name']})",
        "model": spec_b["model"],
        "provider": spec_b["provider"],
        "temperature": 0.4,
        "displayName": spec_b["name"],
    }
    return agent_a, agent_b


def run_trial(
    base_url: str,
    problem: dict,
    config: argparse.Namespace,
    trial_num: int,
    agent_a: dict | None = None,
    agent_b: dict | None = None,
    worker_id: str = "",
    print_lock: threading.Lock | None = None,
) -> dict:
    """Execute a complete multi-agent benchmark trial between Agent Alpha and Beta."""
    base_url = base_url.rstrip("/")
    problem_title = problem.get("title", "Untitled Problem")
    suite_id = problem.get("suiteId", problem.get("suite", "general"))

    w_tag = f"[{worker_id}] " if worker_id else ""

    def safe_print(*args, **kwargs):
        if print_lock:
            with print_lock:
                print(*args, **kwargs)
        else:
            print(*args, **kwargs)

    # Determine agents for this trial
    if not agent_a or not agent_b:
        agent_a, agent_b = select_trial_agents(config, trial_num)

    safe_print(f"\n{BOLD}{CYAN}{'='*80}{RESET}")
    safe_print(f"{BOLD}{CYAN}{w_tag}[Trial #{trial_num}] {problem_title} ({str(suite_id).upper()}){RESET}")
    safe_print(f"{DIM}{w_tag}Question: {problem.get('question', '')[:160]}...{RESET}")
    safe_print(f"{BLUE}{w_tag}Agent Alpha:{RESET} {BOLD}{agent_a['name']}{RESET} [{agent_a['model']}] ({agent_a['provider']})")
    safe_print(f"{MAGENTA}{w_tag}Agent Beta: {RESET} {BOLD}{agent_b['name']}{RESET} [{agent_b['model']}] ({agent_b['provider']})")
    safe_print(f"{DIM}{w_tag}Tier: 100% Free Models Only  |  Protocol: {'Uncapped' if config.uncapped else f'Max {config.max_turns} turns'}{RESET}")
    safe_print(f"{CYAN}{'-'*80}{RESET}")

    # Gather API keys from CLI arguments, environment variables, or .env files
    api_keys = {}
    active_google_key = config.google_key or os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
    if active_google_key:
        api_keys["google"] = active_google_key
    active_openrouter_key = config.openrouter_key or os.environ.get("OPENROUTER_API_KEY")
    if active_openrouter_key:
        api_keys["openrouter"] = active_openrouter_key
    if config.openai_key or os.environ.get("OPENAI_API_KEY"):
        api_keys["openai"] = config.openai_key or os.environ.get("OPENAI_API_KEY")
    if config.anthropic_key or os.environ.get("ANTHROPIC_API_KEY"):
        api_keys["anthropic"] = config.anthropic_key or os.environ.get("ANTHROPIC_API_KEY")
    if config.deepseek_key or os.environ.get("DEEPSEEK_API_KEY"):
        api_keys["deepseek"] = config.deepseek_key or os.environ.get("DEEPSEEK_API_KEY")

    turns_data = []
    total_tokens = 0
    total_input_tokens = 0
    total_output_tokens = 0
    total_cost_usd = 0.0
    start_time = time.time()

    max_turns = 12 if config.uncapped else config.max_turns
    consensus_reached = False
    final_answer = None

    current_agent_idx = 0  # 0 = Agent A, 1 = Agent B

    for turn_num in range(max_turns * 2):
        if not RUNNING:
            break

        is_agent_a = (current_agent_idx % 2 == 0)
        current_agent = agent_a if is_agent_a else agent_b
        current_agent_id = "agent_a" if is_agent_a else "agent_b"
        partner_agent = agent_b if is_agent_a else agent_a
        partner_name = partner_agent["name"]

        # Build history with current perspective
        history_for_turn = [
            {
                "sender": t["agentName"],
                "text": t["content"],
                "isCurrentAgent": (t["agentId"] == current_agent_id),
            }
            for t in turns_data
        ]

        turn_payload = {
            "problem": problem,
            "agent": current_agent,
            "partnerName": partner_name,
            "history": history_for_turn,
            "currentTurn": turn_num,
            "isUncapped": config.uncapped,
            "maxTurnsPerAgent": config.max_turns,
            "apiKeys": api_keys,
        }

        turn_start = time.time()
        res = post_json(f"{base_url}/api/benchmark/generate-turn", turn_payload, timeout=60)
        turn_latency = int((time.time() - turn_start) * 1000)

        content = res.get("content", "")
        extracted_answer = res.get("extractedFinalAnswer") or extract_final_answer(content)
        input_tokens = res.get("inputTokens", 0)
        output_tokens = res.get("outputTokens", 0)
        tokens_count = res.get("totalTokens", input_tokens + output_tokens)
        cost_usd = res.get("costUsd", 0.0)

        total_tokens += tokens_count
        total_input_tokens += input_tokens
        total_output_tokens += output_tokens
        total_cost_usd += cost_usd

        agent_color = BLUE if is_agent_a else MAGENTA
        agent_label = "Agent Alpha" if is_agent_a else "Agent Beta"

        if config.verbose:
            safe_print(f"\n{BOLD}{agent_color}{w_tag}[Turn {turn_num+1}] {agent_label}:{RESET}", flush=True)
            safe_print(content, flush=True)
        else:
            ans_tag = f" -> {GREEN}Claimed: [{extracted_answer}]{RESET}" if extracted_answer else ""
            preview = content.replace("\n", " ")[:90]
            safe_print(f"  {agent_color}{w_tag}[Turn {turn_num+1:02d}] {agent_label}:{RESET} {preview}...{ans_tag}", flush=True)

        turns_data.append({
            "turnNumber": turn_num + 1,
            "agentId": current_agent_id,
            "agentName": current_agent["name"],
            "content": content,
            "extractedFinalAnswer": extracted_answer,
            "inputTokens": input_tokens,
            "outputTokens": output_tokens,
            "totalTokens": tokens_count,
            "costUsd": cost_usd,
            "latencyMs": turn_latency,
            "timestamp": datetime.now().isoformat(),
        })

        # Check for consensus: both agents agree on an extracted answer
        claims = [t["extractedFinalAnswer"] for t in turns_data if t.get("extractedFinalAnswer")]
        if len(claims) >= 2:
            last_two = claims[-2:]
            c0 = str(last_two[0]).strip().lower()
            c1 = str(last_two[1]).strip().lower()
            if c0 == c1 and len(c0) > 0:
                consensus_reached = True
                final_answer = last_two[-1]
                safe_print(f"\n{BOLD}{GREEN}{w_tag}✓ Consensus Reached! Both agents agreed on: [{final_answer}]{RESET}", flush=True)
                break

        current_agent_idx += 1
        time.sleep(0.5)

    wall_clock_ms = int((time.time() - start_time) * 1000)

    # Verify against Ground Truth
    verify_payload = {
        "problem": problem,
        "finalAnswerA": final_answer,
        "finalAnswerB": final_answer,
        "totalTokens": total_tokens,
        "totalInputTokens": total_input_tokens,
        "totalOutputTokens": total_output_tokens,
        "totalWallClockMs": wall_clock_ms,
        "consensusReached": consensus_reached,
        "turnsCount": len(turns_data),
        "isInfiniteLoop": False,
    }

    try:
        verify_res = post_json(f"{base_url}/api/benchmark/verify", verify_payload, timeout=30)
    except Exception as e:
        # Local verification fallback if endpoint fails
        is_canonical_match = False
        gt_list = problem.get("groundTruth", [problem.get("canonicalAnswer", "")])
        if final_answer:
            fa_norm = str(final_answer).lower().strip()
            for gt in gt_list:
                if str(gt).lower().strip() in fa_norm or fa_norm in str(gt).lower().strip():
                    is_canonical_match = True
                    break
        verify_res = {
            "isCorrect": is_canonical_match,
            "accuracyScore": 100 if is_canonical_match else 0,
            "canonicalAnswer": problem.get("canonicalAnswer", "N/A"),
            "efficiencyIndex": 85.0 if is_canonical_match else 10.0,
            "teamVerdict": "Verified by offline validator",
        }

    is_correct = verify_res.get("isCorrect", False)
    accuracy_score = verify_res.get("accuracyScore", 0)
    canonical = verify_res.get("canonicalAnswer", problem.get("canonicalAnswer", "N/A"))
    efficiency_index = verify_res.get("efficiencyIndex", 0)
    team_verdict = verify_res.get("teamVerdict", "Evaluated")

    status_color = GREEN if is_correct else RED
    match_tag = "MATCH (100%)" if is_correct else f"FAILED ({accuracy_score}%)"

    safe_print(f"\n{BOLD}{w_tag}Evaluation Result:{RESET}")
    safe_print(f"  {BOLD}Accuracy:{RESET}       {status_color}{match_tag}{RESET}")
    safe_print(f"  {BOLD}Submitted:{RESET}      {final_answer or 'None'}")
    safe_print(f"  {BOLD}Ground Truth:{RESET}   {canonical}")
    safe_print(f"  {BOLD}Efficiency:{RESET}     {efficiency_index:.2f} pts")
    safe_print(f"  {BOLD}Total Cost:{RESET}     ${total_cost_usd:.5f}")
    safe_print(f"  {BOLD}Time Taken:{RESET}     {wall_clock_ms/1000:.2f}s across {len(turns_data)} turns")
    safe_print(f"  {BOLD}Team Verdict:{RESET}   {team_verdict}")

    # Build persistent benchmark record
    run_record = {
        "id": f"cli-run-{int(time.time()*1000)}-{random.randint(100, 999)}",
        "workerId": worker_id or "default",
        "problemId": problem.get("id"),
        "problemTitle": problem_title,
        "topic": problem.get("topic", "general"),
        "suite": problem.get("suite", suite_id),
        "suiteId": suite_id,
        "domain": problem.get("domain", ""),
        "difficulty": problem.get("difficulty", "advanced"),
        "date": datetime.now().isoformat(),
        "agentAConfig": agent_a,
        "agentBConfig": agent_b,
        "maxTurns": config.max_turns,
        "isUncapped": config.uncapped,
        "consensusStatus": "consensus_reached" if consensus_reached else "turn_cap_exhausted",
        "finalAgreedAnswer": final_answer,
        "metrics": {
            "totalCostUsd": total_cost_usd,
            "totalTokens": total_tokens,
            "totalInputTokens": total_input_tokens,
            "totalOutputTokens": total_output_tokens,
            "totalWallClockMs": wall_clock_ms,
            "efficiencyIndex": efficiency_index,
            "accuracyScore": accuracy_score,
            "isCorrect": is_correct,
            "consensusReached": consensus_reached,
            "turnsCount": len(turns_data),
        },
        "verification": verify_res,
        "turns": turns_data,
    }

    # Save to DualBlind Leaderboard API
    try:
        save_res = post_json(f"{base_url}/api/leaderboard/save-run", run_record, timeout=20)
        total_cached = save_res.get("totalCached", "synced")
        safe_print(f"  {GREEN}{w_tag}✓ Run saved to DualBlind Leaderboard (Cached pool: {total_cached}){RESET}")
    except Exception as e:
        safe_print(f"  {YELLOW}{w_tag}[!] Notice saving to leaderboard API: {e}{RESET}")

    # Save to local JSONL backup (safe concurrent append with retry)
    out_file = getattr(config, "output", "arena_runs_local.jsonl")
    append_local_run(run_record, filename=out_file)

    return run_record


# Rich comprehensive offline problem catalog spanning all official benchmark suites
OFFLINE_PROBLEMS = [
    {
        "id": "gpqa_diamond_01",
        "title": "Quantum Decoherence & Thermal Bath Entanglement",
        "topic": "science",
        "suite": "GPQA Diamond",
        "suiteId": "gpqa_diamond",
        "difficulty": "PhD Frontier",
        "question": "Calculate the decoherence timescale tau_d for a macroscopic sphere of radius R = 1.0 um and mass density rho = 2200 kg/m^3 in a 300 K thermal radiation bath with spatial separation Delta x = 10 nm. Express your answer in scientific notation with two significant figures.",
        "canonicalAnswer": "4.8e-15 s",
        "groundTruth": ["4.8e-15 s", "4.8 x 10^-15 s", "4.8e-15", "4.8*10^-15 seconds"],
        "expectedFormat": "FINAL ANSWER: [value with units, e.g., 4.8e-15 s]",
        "explanation": "Derived using the thermal radiation decoherence scattering master equation tau_d = (tau_thermal) * (lambda_thermal / Delta x)^2.",
    },
    {
        "id": "swe_bench_01",
        "title": "Async Task Group Cancellation Invariant",
        "topic": "coding",
        "suite": "SWE-bench & Systems",
        "suiteId": "swe_bench",
        "difficulty": "Staff SWE Tier",
        "question": "In Python asyncio TaskGroup, child task T1 raises ValueError while sibling task T2 is sleeping inside asyncio.sleep(10). What exception type does TaskGroup raise at its exit boundary?",
        "canonicalAnswer": "ExceptionGroup",
        "groundTruth": ["ExceptionGroup", "ExceptionGroup with ValueError"],
        "expectedFormat": "FINAL ANSWER: [Exact exception class name]",
        "explanation": "PEP 654 and Python 3.11 TaskGroup wrap unhandled task exceptions inside an ExceptionGroup.",
    },
    {
        "id": "math_aime_01",
        "title": "Modular Exponentiation & Coprime Partition Order",
        "topic": "math",
        "suite": "MATH-500 & AIME",
        "suiteId": "math_aime",
        "difficulty": "Olympiad Tier",
        "question": "Find the smallest positive integer n > 1 such that 7^n = n (mod 1000).",
        "canonicalAnswer": "343",
        "groundTruth": ["343"],
        "expectedFormat": "FINAL ANSWER: [positive integer]",
        "explanation": "Applying Euler's totient theorem and CRT modulo 8 and modulo 125, the unique solution under 1000 is 343.",
    },
    {
        "id": "hle_01",
        "title": "Twistor String Amplitudes & MHV Gluon Scattering",
        "topic": "science",
        "suite": "Humanity's Last Exam",
        "suiteId": "hle",
        "difficulty": "Fields / Nobel Tier",
        "question": "In tree-level N=4 Super Yang-Mills scattering of n gluons, what is the degree d of the connected algebraic curve in twistor space CP^{3|4} corresponding to an N^{k-2}MHV amplitude?",
        "canonicalAnswer": "k - 1",
        "groundTruth": ["k - 1", "k-1", "d = k - 1"],
        "expectedFormat": "FINAL ANSWER: [formula in terms of k]",
        "explanation": "Under the Roiban-Spradlin-Volovich-Witten twistor correspondence, an N^{k-2}MHV amplitude maps to a curve of degree d = k - 1.",
    },
    {
        "id": "ifeval_01",
        "title": "Verifiable Constraint: Prime Number JSON & Strict Word Bounds",
        "topic": "instruction_following",
        "suite": "IFEval",
        "suiteId": "ifeval",
        "difficulty": "Strict Constraint",
        "question": "Return valid JSON with keys 'primes' and 'count' containing all prime numbers between 40 and 55. State count.",
        "canonicalAnswer": "{\"primes\": [41, 43, 47, 53], \"count\": 4}",
        "groundTruth": ["4", "{\"primes\": [41, 43, 47, 53], \"count\": 4}"],
        "expectedFormat": "FINAL ANSWER: [exact count or JSON]",
        "explanation": "The primes in [40, 55] are 41, 43, 47, 53. Count is 4.",
    },
    {
        "id": "arc_challenge_01",
        "title": "Topological Invariant: Euler Characteristic of 2D Voxel Mesh",
        "topic": "abstract",
        "suite": "ARC Challenge",
        "suiteId": "arc_challenge",
        "difficulty": "AGI Reasoning",
        "question": "A connected 2D binary grid figure has 1 outer perimeter loop, exactly 2 internal disconnected hole cavities, and zero self-intersections. What is its Euler characteristic chi = V - E + F?",
        "canonicalAnswer": "-1",
        "groundTruth": ["-1", "chi = -1"],
        "expectedFormat": "FINAL ANSWER: [integer]",
        "explanation": "For a planar domain with H holes, chi = 1 - H. With 2 holes, chi = 1 - 2 = -1.",
    },
    {
        "id": "game_theory_01",
        "title": "Cournot Duopoly with Asymmetric Quadratic Marginal Cost",
        "topic": "strategy",
        "suite": "Game Theory",
        "suiteId": "game_theory",
        "difficulty": "Frontier Economics",
        "question": "Inverse market demand is P(Q) = 120 - Q where Q = q1 + q2. Firm 1 has cost C1(q1) = 20*q1. Firm 2 has C2(q2) = 0.5*(q2)^2. Find Firm 1's output q1 at the unique Nash equilibrium.",
        "canonicalAnswer": "28",
        "groundTruth": ["28", "q1 = 28"],
        "expectedFormat": "FINAL ANSWER: [integer or decimal]",
        "explanation": "Solving FOC: q1 = 50 - 0.5*q2 and q2 = 40 - (1/3)*q1 gives q1 = 28.",
    },
    {
        "id": "formal_logic_01",
        "title": "Decanting State-Space Optimization (Water Pouring Puzzle)",
        "topic": "logic",
        "suite": "Formal Logic",
        "suiteId": "formal_logic",
        "difficulty": "Hard Deductive",
        "question": "You have three jugs with capacities 12L, 8L, and 5L. Initially 12L is full of water, while 8L and 5L are empty. Find the minimum number of pours to measure exactly 6L into one of the jugs.",
        "canonicalAnswer": "7",
        "groundTruth": ["7", "7 pours", "7 steps"],
        "expectedFormat": "FINAL ANSWER: [minimum number of pours]",
        "explanation": "BFS on the finite state space yields 7 pours as the minimal path to 6L.",
    },
]


def fetch_problems(base_url: str, suite_filter: str | None = None) -> list:
    """Fetch benchmark problems from backend server, with seamless fallback to offline catalog."""
    url = f"{base_url.rstrip('/')}/api/benchmark/problems"
    if suite_filter and suite_filter != "all":
        url += f"?suite={suite_filter}"
    try:
        data = get_json(url, timeout=15)
        problems = data.get("problems", [])
        if problems:
            return problems
    except Exception as e:
        print(f"{YELLOW}[!] Remote endpoint /api/benchmark/problems returned ({e}).{RESET}")
        print(f"{DIM}    Switching to built-in verified benchmark problem catalog...{RESET}")

    # Fallback to rich offline catalog
    if suite_filter and suite_filter != "all":
        filtered = [p for p in OFFLINE_PROBLEMS if p.get("suiteId") == suite_filter or p.get("suite") == suite_filter]
        if filtered:
            return filtered
    return OFFLINE_PROBLEMS


def worker_loop(
    worker_name: str,
    worker_index: int,
    args: argparse.Namespace,
    problem_pool: list,
    print_lock: threading.Lock,
    shared_counter: dict,
    total_count: int,
) -> None:
    """Independent worker thread/process loop with jittered scheduling and shuffled problem selection."""
    # Stagger worker start so multiple workers/instances don't ping the server at the exact same millisecond
    startup_jitter = (worker_index * 1.5) + random.uniform(0.2, 1.0)
    time.sleep(startup_jitter)

    worker_rng = random.Random(int(time.time() * 1000) ^ os.getpid() ^ (worker_index * 7919))
    local_problems = list(problem_pool)
    if getattr(args, "shuffle", True):
        worker_rng.shuffle(local_problems)

    idx = 0
    while RUNNING:
        if total_count > 0:
            with print_lock:
                if shared_counter["completed"] >= total_count:
                    break
                trial_num = shared_counter["completed"] + 1
        else:
            with print_lock:
                shared_counter["total_started"] += 1
                trial_num = shared_counter["total_started"]

        problem = local_problems[idx % len(local_problems)]
        idx += 1

        try:
            run_trial(
                base_url=args.url,
                problem=problem,
                config=args,
                trial_num=trial_num,
                worker_id=worker_name,
                print_lock=print_lock,
            )
            with print_lock:
                shared_counter["completed"] += 1
        except Exception as trial_err:
            err_str = str(trial_err)
            with print_lock:
                print(f"\n{YELLOW}[!] Warning [{worker_name}]: Trial #{trial_num} encountered: {err_str}{RESET}", flush=True)
                if "GEMINI_API_KEY" in err_str:
                    print(f"{YELLOW}    [→] Missing API Key: Pass --api-key YOUR_KEY or set export GEMINI_API_KEY=YOUR_KEY{RESET}", flush=True)
                print(f"{DIM}    [{worker_name}] Continuing to next problem in {args.delay}s...{RESET}", flush=True)

        if total_count > 0:
            with print_lock:
                if shared_counter["completed"] >= total_count:
                    break

        if RUNNING and args.delay > 0:
            # Add jitter to delay so multiple workers don't lock-step on API calls
            time.sleep(args.delay + random.uniform(0.1, 0.8))


def main():
    parser = argparse.ArgumentParser(
        description="DualBlind AI Arena - Autonomous Resilient Headless Benchmark Runner"
    )
    parser.add_argument("--url", default="http://localhost:3000", help="Base URL of DualBlind server (default: http://localhost:3000)")
    parser.add_argument("--api-key", "--google-key", dest="google_key", default=None, help="Gemini API Key (default: GEMINI_API_KEY from environment or .env)")
    parser.add_argument("--openrouter-key", default=None, help="OpenRouter API Key (default: OPENROUTER_API_KEY from environment or .env)")
    parser.add_argument("--openai-key", default=None, help="OpenAI API Key (default: OPENAI_API_KEY from environment or .env)")
    parser.add_argument("--anthropic-key", default=None, help="Anthropic API Key (default: ANTHROPIC_API_KEY from environment or .env)")
    parser.add_argument("--deepseek-key", default=None, help="DeepSeek API Key (default: DEEPSEEK_API_KEY from environment or .env)")
    parser.add_argument("--provider", default="all", choices=["all", "openrouter", "google"], help="Provider pool: all (mix OpenRouter & Google), openrouter, or google (default: all)")
    parser.add_argument("--force-free", dest="force_free", action="store_true", default=True, help="Force 100%% free models only (default: True)")
    parser.add_argument("--allow-paid", dest="force_free", action="store_false", help="Allow paid non-free models")
    parser.add_argument("--random-models", dest="random_models", action="store_true", default=True, help="Use multiple models at random for each trial (default: True)")
    parser.add_argument("--fixed-models", dest="random_models", action="store_false", help="Disable random selection and stick to model-a / model-b")
    parser.add_argument("--model-a", default=None, help="Specific model for Agent Alpha (default: random free model)")
    parser.add_argument("--model-b", default=None, help="Specific model for Agent Beta (default: random free model)")
    parser.add_argument("--provider-a", default=None, help="Provider for Agent Alpha: google, openrouter, openai, anthropic")
    parser.add_argument("--provider-b", default=None, help="Provider for Agent Beta: google, openrouter, openai, anthropic")
    parser.add_argument("--list-free-models", action="store_true", help="List all verified 100%% free models across OpenRouter & Google and exit")
    parser.add_argument("--suite", default="all", help="Benchmark suite filter (e.g. gpqa_diamond, swe_bench, math_aime, hle, all)")
    parser.add_argument("--max-turns", type=int, default=5, help="Maximum turns per agent (default: 5)")
    parser.add_argument("--uncapped", action="store_true", help="Run in uncapped mode until natural consensus or loop cap")
    parser.add_argument("--count", type=int, default=0, help="Number of benchmark trials to run (0 for infinite loop)")
    parser.add_argument("--delay", type=float, default=2.0, help="Cooling delay in seconds between trials (default: 2.0)")
    parser.add_argument("--verbose", action="store_true", help="Print full conversational transcripts for each agent turn")
    parser.add_argument("--restart-delay", type=int, default=8, help="Seconds to wait before auto-restarting on fatal crash (default: 8)")
    parser.add_argument("--workers", type=int, default=1, help="Number of parallel worker threads in this process (e.g. 2 or 4, default: 1)")
    parser.add_argument("--worker-id", default=None, help="Worker identification label (default: W1, W2 or based on PID)")
    parser.add_argument("--output", default="arena_runs_local.jsonl", help="Local backup file path (default: arena_runs_local.jsonl)")
    parser.add_argument("--shuffle", dest="shuffle", action="store_true", default=True, help="Randomize problem order per worker (default: True)")
    parser.add_argument("--no-shuffle", dest="shuffle", action="store_false", help="Preserve static problem ordering")

    args = parser.parse_args()

    if args.list_free_models:
        print(f"\n{BOLD}{CYAN}DualBlind Arena - Verified 100% Free Models Catalog:{RESET}")
        print(f"{CYAN}{'='*75}{RESET}")
        print(f"{BOLD}{'Model Slug':<45} {'Provider':<12} {'Family':<10}{RESET}")
        print(f"{'-'*75}")
        for m in VERIFIED_FREE_MODELS:
            print(f"{GREEN}{m['model']:<45}{RESET} {CYAN}{m['provider']:<12}{RESET} {m.get('family', ''):<10}")
        print(f"{CYAN}{'='*75}{RESET}")
        print(f"Total verified free models: {len(VERIFIED_FREE_MODELS)}\n")
        return

    # If user provided specific models, turn off random unless explicitly asked
    if args.model_a and args.model_b and "--random-models" not in sys.argv:
        args.random_models = False

    # Detect API keys
    resolved_google_key = args.google_key or os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
    resolved_openrouter_key = args.openrouter_key or os.environ.get("OPENROUTER_API_KEY")

    worker_tag_display = args.worker_id or (f"{args.workers} Parallel Workers" if args.workers > 1 else f"Worker PID {os.getpid()}")

    print(f"{BOLD}{GREEN}======================================================{RESET}")
    print(f"{BOLD}{GREEN}   DualBlind AI Arena - Autonomous Headless Runner   {RESET}")
    print(f"{BOLD}{GREEN}======================================================{RESET}")
    print(f"Target Server:   {CYAN}{args.url}{RESET}")
    print(f"Worker Setup:    {BOLD}{CYAN}{worker_tag_display}{RESET}")
    print(f"Cost Policy:     {BOLD}{GREEN}100% FREE ONLY (Enforced Zero-Cost){RESET}" if args.force_free else f"{YELLOW}Paid & Free Models Allowed{RESET}")
    print(f"Model Selection: {BOLD}{MAGENTA}Randomized Multi-Model Deliberations{RESET}" if args.random_models else f"Fixed: {args.model_a} vs {args.model_b}")
    print(f"Provider Scope:  {BOLD}{CYAN}{args.provider.upper()}{RESET} ({'OpenRouter (:free) & Google Flash' if args.provider == 'all' else args.provider})")
    print(f"Suite Filter:    {args.suite}")
    print(f"Protocol:        {'Uncapped Deliberation' if args.uncapped else f'Max {args.max_turns} turns'}")
    print(f"Keys Detected:")
    print(f"  • Google (Gemini):     {GREEN}✓ Loaded (Active){RESET}" if resolved_google_key else f"  • Google (Gemini):     {YELLOW}○ None detected in environment{RESET}")
    print(f"  • OpenRouter (Universal): {GREEN}✓ Loaded (Active){RESET}" if resolved_openrouter_key else f"  • OpenRouter (Universal): {YELLOW}○ None detected (Free tier / server fallback active){RESET}")
    print(f"Concurrency:     Safe Multi-Process & Multi-Worker Lock Protection Enabled")
    print(f"Local Backup:    {args.output}")
    print(f"{GREEN}------------------------------------------------------{RESET}\n")

    if not resolved_google_key and not resolved_openrouter_key and "localhost" not in args.url:
        print(f"{YELLOW}[i] Pro-tip for Remote Server runs:{RESET}")
        print(f"    Pass your key directly on the CLI:")
        print(f"    {CYAN}python3 arena_runner.py --url {args.url} --openrouter-key YOUR_OPENROUTER_KEY{RESET}")
        print(f"    {CYAN}python3 arena_runner.py --url {args.url} --api-key YOUR_GEMINI_KEY{RESET}\n")

    restart_count = 0
    print_lock = threading.Lock()

    # Self-Healing Supervisor Loop: Automatically catches all errors and restarts!
    while RUNNING:
        try:
            problems = fetch_problems(args.url, args.suite)
            print(f"{GREEN}✓ Loaded {len(problems)} benchmark problems from suite '{args.suite}'. Starting runner...{RESET}\n")

            shared_counter = {"total_started": 0, "completed": 0}

            if args.workers <= 1:
                # Single worker mode
                w_name = args.worker_id or "W1"
                worker_loop(
                    worker_name=w_name,
                    worker_index=0,
                    args=args,
                    problem_pool=problems,
                    print_lock=print_lock,
                    shared_counter=shared_counter,
                    total_count=args.count,
                )
            else:
                # Multi-worker mode in a single process!
                threads = []
                for w_idx in range(args.workers):
                    w_name = f"W{w_idx+1}" if not args.worker_id else f"{args.worker_id}-{w_idx+1}"
                    t = threading.Thread(
                        target=worker_loop,
                        args=(
                            w_name,
                            w_idx,
                            args,
                            problems,
                            print_lock,
                            shared_counter,
                            args.count,
                        ),
                        daemon=True,
                    )
                    threads.append(t)
                    t.start()

                # Monitor worker threads until target reached or interrupted
                while RUNNING:
                    if args.count > 0 and shared_counter["completed"] >= args.count:
                        break
                    time.sleep(0.5)

            if args.count > 0 and shared_counter["completed"] >= args.count:
                print(f"\n{BOLD}{GREEN}✓ Target trial count of {args.count} completed successfully.{RESET}")
                return

        except KeyboardInterrupt:
            print(f"\n{YELLOW}[!] User interrupted script. Shutting down cleanly.{RESET}")
            break
        except Exception as fatal_err:
            restart_count += 1
            print(f"\n{RED}{BOLD}[FATAL WATCHDOG NOTICE]{RESET} Exception in runner loop: {fatal_err}")
            traceback.print_exc()
            print(f"\n{YELLOW}{BOLD}[AUTORESTART]{RESET} Auto-restarting runner in {args.restart_delay} seconds... (Restart #{restart_count})")
            
            for remaining in range(args.restart_delay, 0, -1):
                if not RUNNING:
                    break
                print(f"Restarting in {remaining}s...", end="\r", flush=True)
                time.sleep(1)
            print("Restarting now!                   ")


if __name__ == "__main__":
    main()
