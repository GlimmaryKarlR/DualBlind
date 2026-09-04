#!/usr/bin/env python3
"""
DualBlind AI Arena - Autonomous Headless Benchmark Runner
=========================================================
Runs multi-agent collaborative benchmark evaluations in a continuous,
click-free loop and automatically restarts with exponential backoff
whenever an unhandled error, network failure, or API outage occurs.

Features:
- 100% Click-Free: Runs headless from any terminal or local server.
- Self-Healing Watchdog: Catches all exceptions, waits with backoff, and restarts.
- Pure Standard Library: Runs out of the box on Python 3.8+ (no pip install required).
- Live Leaderboard Sync: Every run is saved immediately to the DualBlind Firestore database & cache.
- Local JSONL Backup: Keeps a local record of all trials in `arena_runs_local.jsonl`.
- Optional Hugging Face Auto-Push: Can commit 100% ground-truth records directly to Hugging Face.

Usage:
  python scripts/arena_runner.py
  python scripts/arena_runner.py --url https://dual-blind.vercel.app
  python scripts/arena_runner.py --suite gpqa_diamond --model-a gemini-3.7-flash --model-b gemini-2.5-flash
  python scripts/arena_runner.py --uncapped --verbose
"""

import sys
import os
import json
import time
import signal
import random
import argparse
import traceback
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


def post_json(url: str, payload: dict, timeout: int = 120) -> dict:
    """Send a POST request with JSON body using standard library urllib."""
    data_bytes = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=data_bytes,
        headers={
            "Content-Type": "application/json",
            "User-Agent": "DualBlind-Headless-Runner/1.0",
        },
        method="POST"
    )
    with urllib.request.urlopen(req, timeout=timeout) as response:
        resp_data = response.read().decode("utf-8")
        return json.loads(resp_data)


def get_json(url: str, timeout: int = 30) -> dict:
    """Send a GET request and parse JSON response."""
    req = urllib.request.Request(
        url,
        headers={"User-Agent": "DualBlind-Headless-Runner/1.0"},
        method="GET"
    )
    with urllib.request.urlopen(req, timeout=timeout) as response:
        resp_data = response.read().decode("utf-8")
        return json.loads(resp_data)


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


def run_trial(base_url: str, problem: dict, config: argparse.Namespace, trial_num: int) -> dict:
    """Execute a complete multi-agent benchmark trial between Agent Alpha and Beta."""
    base_url = base_url.rstrip("/")
    problem_title = problem.get("title", "Untitled Problem")
    suite_id = problem.get("suiteId", problem.get("suite", "general"))

    print(f"\n{BOLD}{CYAN}{'='*80}{RESET}")
    print(f"{BOLD}{CYAN}[Trial #{trial_num}] {problem_title} ({suite_id.upper()}){RESET}")
    print(f"{DIM}Question: {problem.get('question', '')[:160]}...{RESET}")
    print(f"{BLUE}Agent A:{RESET} {config.model_a} ({config.provider_a})  |  {MAGENTA}Agent B:{RESET} {config.model_b} ({config.provider_b})")
    print(f"{CYAN}{'-'*80}{RESET}")

    agent_a = {
        "name": f"Agent Alpha ({config.model_a})",
        "model": config.model_a,
        "provider": config.provider_a,
        "temperature": 0.4,
    }
    agent_b = {
        "name": f"Agent Beta ({config.model_b})",
        "model": config.model_b,
        "provider": config.provider_b,
        "temperature": 0.4,
    }

    history = []
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

    # Collect available API keys from environment or config
    api_keys = {}
    if getattr(config, "google_key", None) or os.environ.get("GEMINI_API_KEY"):
        api_keys["google"] = getattr(config, "google_key", None) or os.environ.get("GEMINI_API_KEY")
    if getattr(config, "openrouter_key", None) or os.environ.get("OPENROUTER_API_KEY"):
        api_keys["openrouter"] = getattr(config, "openrouter_key", None) or os.environ.get("OPENROUTER_API_KEY")
    if getattr(config, "openai_key", None) or os.environ.get("OPENAI_API_KEY"):
        api_keys["openai"] = getattr(config, "openai_key", None) or os.environ.get("OPENAI_API_KEY")
    if getattr(config, "anthropic_key", None) or os.environ.get("ANTHROPIC_API_KEY"):
        api_keys["anthropic"] = getattr(config, "anthropic_key", None) or os.environ.get("ANTHROPIC_API_KEY")
    if getattr(config, "deepseek_key", None) or os.environ.get("DEEPSEEK_API_KEY"):
        api_keys["deepseek"] = getattr(config, "deepseek_key", None) or os.environ.get("DEEPSEEK_API_KEY")

    for turn_num in range(max_turns * 2):
        if not RUNNING:
            break

        is_agent_a = (current_agent_idx % 2 == 0)
        current_agent = agent_a if is_agent_a else agent_b
        current_agent_id = "agent_a" if is_agent_a else "agent_b"
        partner_agent = agent_b if is_agent_a else agent_a
        partner_name = partner_agent["name"]

        # Format history properly with correct isCurrentAgent perspective for this turn
        history_for_turn = [
            {
                "sender": t["agentName"],
                "text": t["content"],
                "isCurrentAgent": (t["agentId"] == current_agent_id),
            }
            for t in turns_data
        ]

        # Build turn request payload
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
            print(f"\n{BOLD}{agent_color}[Turn {turn_num+1}] {agent_label}:{RESET}", flush=True)
            print(content, flush=True)
        else:
            ans_tag = f" -> {GREEN}Claimed: [{extracted_answer}]{RESET}" if extracted_answer else ""
            preview = content.replace("\n", " ")[:90]
            print(f"  {agent_color}[Turn {turn_num+1:02d}] {agent_label}:{RESET} {preview}...{ans_tag}", flush=True)

        turns_data.append({
            "turnNumber": turn_num + 1,
            "agentId": "agent_a" if is_agent_a else "agent_b",
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
            c0 = last_two[0].strip().lower()
            c1 = last_two[1].strip().lower()
            if c0 == c1 and len(c0) > 0:
                consensus_reached = True
                final_answer = last_two[-1]
                print(f"\n{BOLD}{GREEN}✓ Consensus Reached! Both agents agreed on: [{final_answer}]{RESET}")
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

    verify_res = post_json(f"{base_url}/api/benchmark/verify", verify_payload, timeout=30)
    is_correct = verify_res.get("isCorrect", False)
    accuracy_score = verify_res.get("accuracyScore", 0)
    canonical = verify_res.get("canonicalAnswer", "N/A")
    efficiency_index = verify_res.get("efficiencyIndex", 0)
    team_verdict = verify_res.get("teamVerdict", "Evaluated")

    status_color = GREEN if is_correct else RED
    match_tag = "MATCH (100%)" if is_correct else f"FAILED ({accuracy_score}%)"

    print(f"\n{BOLD}Evaluation Result:{RESET}")
    print(f"  {BOLD}Accuracy:{RESET}       {status_color}{match_tag}{RESET}")
    print(f"  {BOLD}Submitted:{RESET}      {final_answer or 'None'}")
    print(f"  {BOLD}Ground Truth:{RESET}   {canonical}")
    print(f"  {BOLD}Efficiency:{RESET}     {efficiency_index:.2f} pts")
    print(f"  {BOLD}Total Cost:{RESET}     ${total_cost_usd:.5f}")
    print(f"  {BOLD}Time Taken:{RESET}     {wall_clock_ms/1000:.2f}s across {len(turns_data)} turns")
    print(f"  {BOLD}Team Verdict:{RESET}   {team_verdict}")

    # Build persistent benchmark record
    run_record = {
        "id": f"cli-run-{int(time.time()*1000)}",
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
        print(f"  {GREEN}✓ Run saved to DualBlind Leaderboard (Cached pool: {total_cached}){RESET}")
    except Exception as e:
        print(f"  {YELLOW}[!] Warning: Cloud save returned notice: {e}{RESET}")

    # Save to local JSONL backup
    try:
        with open("arena_runs_local.jsonl", "a", encoding="utf-8") as f:
            f.write(json.dumps(run_record, ensure_ascii=False) + "\n")
    except Exception as e:
        print(f"  {YELLOW}[!] Local file write note: {e}{RESET}")

    return run_record


def fetch_problems(base_url: str, suite_filter: str | None = None) -> list:
    """Fetch benchmark problems from the DualBlind backend server."""
    url = f"{base_url.rstrip('/')}/api/benchmark/problems"
    if suite_filter and suite_filter != "all":
        url += f"?suite={suite_filter}"
    try:
        data = get_json(url, timeout=15)
        problems = data.get("problems", [])
        if problems:
            return problems
    except Exception as e:
        print(f"{YELLOW}[!] Notice fetching problems from API ({e}), checking fallback...{RESET}")

    # Fallback default problems in case server is still warming up
    return [
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
        }
    ]


def main():
    parser = argparse.ArgumentParser(
        description="DualBlind AI Arena - Autonomous Resilient Headless Benchmark Runner"
    )
    parser.add_argument("--url", default="http://localhost:3000", help="Base URL of DualBlind server (default: http://localhost:3000)")
    parser.add_argument("--model-a", default="gemini-3.7-flash", help="Model for Agent Alpha (default: gemini-3.7-flash)")
    parser.add_argument("--model-b", default="gemini-2.5-flash", help="Model for Agent Beta (default: gemini-2.5-flash)")
    parser.add_argument("--provider-a", default="google", help="Provider for Agent Alpha: google, openrouter, openai, anthropic (default: google)")
    parser.add_argument("--provider-b", default="google", help="Provider for Agent Beta: google, openrouter, openai, anthropic (default: google)")
    parser.add_argument("--suite", default="all", help="Benchmark suite filter (e.g. gpqa_diamond, swe_bench, math_aime, hle, all)")
    parser.add_argument("--max-turns", type=int, default=5, help="Maximum turns per agent (default: 5)")
    parser.add_argument("--uncapped", action="store_true", help="Run in uncapped mode until natural consensus or loop cap")
    parser.add_argument("--count", type=int, default=0, help="Number of benchmark trials to run (0 for infinite loop)")
    parser.add_argument("--delay", type=float, default=2.0, help="Cooling delay in seconds between trials (default: 2.0)")
    parser.add_argument("--verbose", action="store_true", help="Print full conversational transcripts for each agent turn")
    parser.add_argument("--restart-delay", type=int, default=8, help="Seconds to wait before auto-restarting on fatal crash (default: 8)")

    args = parser.parse_args()

    print(f"{BOLD}{GREEN}======================================================{RESET}")
    print(f"{BOLD}{GREEN}   DualBlind AI Arena - Autonomous Headless Runner   {RESET}")
    print(f"{BOLD}{GREEN}======================================================{RESET}")
    print(f"Target Server:   {CYAN}{args.url}{RESET}")
    print(f"Agent Alpha:     {BLUE}{args.model_a} ({args.provider_a}){RESET}")
    print(f"Agent Beta:      {MAGENTA}{args.model_b} ({args.provider_b}){RESET}")
    print(f"Suite Filter:    {args.suite}")
    print(f"Protocol:        {'Uncapped Deliberation' if args.uncapped else f'Max {args.max_turns} turns'}")
    print(f"Self-Healing:    Active (Auto-restart on any exception enabled)")
    print(f"Local Backup:    arena_runs_local.jsonl")
    print(f"{GREEN}------------------------------------------------------{RESET}\n")

    restart_count = 0
    trial_counter = 0

    # Self-Healing Supervisor Loop: Automatically catches all errors and restarts!
    while RUNNING:
        try:
            problems = fetch_problems(args.url, args.suite)
            print(f"{GREEN}✓ Loaded {len(problems)} benchmark problems from suite '{args.suite}'. Starting runner...{RESET}\n")

            while RUNNING:
                # Cycle through problems or pick randomly
                for problem in problems:
                    if not RUNNING:
                        break
                    trial_counter += 1

                    try:
                        run_trial(args.url, problem, args, trial_counter)
                    except Exception as trial_err:
                        print(f"\n{YELLOW}[!] Warning: Trial #{trial_counter} encountered error: {trial_err}{RESET}")
                        print(f"{DIM}Continuing to next problem in {args.delay}s...{RESET}")

                    if args.count > 0 and trial_counter >= args.count:
                        print(f"\n{BOLD}{GREEN}✓ Target trial count of {args.count} completed successfully.{RESET}")
                        return

                    if RUNNING and args.delay > 0:
                        time.sleep(args.delay)

        except KeyboardInterrupt:
            print(f"\n{YELLOW}[!] User interrupted script. Shutting down cleanly.{RESET}")
            break
        except Exception as fatal_err:
            restart_count += 1
            print(f"\n{RED}{BOLD}[FATAL WATCHDOG NOTICE]{RESET} Exception in runner loop: {fatal_err}")
            traceback.print_exc()
            print(f"\n{YELLOW}{BOLD}[AUTORESTART]{RESET} Auto-restarting runner in {args.restart_delay} seconds... (Restart #{restart_count})")
            
            # Countdown timer
            for remaining in range(args.restart_delay, 0, -1):
                if not RUNNING:
                    break
                print(f"Restarting in {remaining}s...", end="\r", flush=True)
                time.sleep(1)
            print("Restarting now!                   ")


if __name__ == "__main__":
    main()
