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

    mergeable_keys = {
        "HF_TOKEN",
        "HF_TOKENS",
        "HUGGINGFACE_API_KEY",
        "HUGGINGFACE_API_KEYS",
        "GEMINI_API_KEY",
        "GEMINI_API_KEYS",
        "GOOGLE_API_KEY",
        "GOOGLE_API_KEYS",
        "OPENROUTER_API_KEY",
        "OPENROUTER_API_KEYS",
    }

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
                            if not k or not v:
                                continue
                            if k not in os.environ or not os.environ[k].strip():
                                os.environ[k] = v
                            elif k in mergeable_keys:
                                existing_items = [x.strip() for x in os.environ[k].split(",") if x.strip()]
                                new_items = [x.strip() for x in v.split(",") if x.strip()]
                                for item in new_items:
                                    if item not in existing_items:
                                        existing_items.append(item)
                                os.environ[k] = ",".join(existing_items)
                except Exception:
                    pass


# Automatically load env candidates at startup
load_env_candidates()

# Default empty key pools (keys are safely read from environment variables or .env.local)
DEFAULT_OPENROUTER_KEYS: list[str] = []
DEFAULT_HF_TOKENS: list[str] = []
DEFAULT_GEMINI_KEYS: list[str] = []

# Dynamic runtime blacklists for depleted/exhausted keys
EXHAUSTED_HF_TOKENS: set[str] = set()
EXHAUSTED_OPENROUTER_KEYS: set[str] = set()
EXHAUSTED_GEMINI_KEYS: set[str] = set()


def get_openrouter_keys(config: argparse.Namespace | None = None, include_exhausted: bool = False) -> list[str]:
    """Return configured OpenRouter keys in rotation order from CLI, comma lists, env vars, and default pool."""
    keys: list[str] = []
    seen: set[str] = set()

    def add_candidates(value: str | None) -> None:
        if not value:
            return
        for item in value.split(","):
            candidate = item.strip()
            if candidate and candidate not in seen:
                keys.append(candidate)
                seen.add(candidate)

    # 1. CLI keys if specified
    cli_keys = getattr(config, "openrouter_keys", None) or []
    for k in cli_keys:
        add_candidates(k)

    # 2. Comma-separated OPENROUTER_API_KEYS
    add_candidates(os.environ.get("OPENROUTER_API_KEYS"))

    # 3. Single OPENROUTER_API_KEY
    add_candidates(os.environ.get("OPENROUTER_API_KEY"))

    # 4. Numbered variants (OPENROUTER_API_KEY_1, OPENROUTER_API_KEY_2, etc.)
    for env_name in sorted(os.environ):
        if env_name.startswith("OPENROUTER_API_KEY_"):
            add_candidates(os.environ.get(env_name))

    # 5. Default embedded zero-cost keys
    for k in DEFAULT_OPENROUTER_KEYS:
        add_candidates(k)

    if not include_exhausted:
        keys = [k for k in keys if k not in EXHAUSTED_OPENROUTER_KEYS]

    return keys


def get_gemini_keys(config: argparse.Namespace | None = None, include_exhausted: bool = False) -> list[str]:
    """Return configured Gemini/Google keys in rotation order from CLI, comma lists, env vars, and default pool."""
    keys: list[str] = []
    seen: set[str] = set()

    def add_candidates(value: str | None) -> None:
        if not value:
            return
        for item in value.split(","):
            candidate = item.strip()
            if candidate and candidate not in seen:
                keys.append(candidate)
                seen.add(candidate)

    # 1. CLI key if specified
    cli_key = getattr(config, "google_key", None)
    if cli_key:
        add_candidates(cli_key)

    # 2. Comma-separated GEMINI_API_KEYS / GOOGLE_API_KEYS
    add_candidates(os.environ.get("GEMINI_API_KEYS"))
    add_candidates(os.environ.get("GOOGLE_API_KEYS"))

    # 3. Single GEMINI_API_KEY / GOOGLE_API_KEY
    add_candidates(os.environ.get("GEMINI_API_KEY"))
    add_candidates(os.environ.get("GOOGLE_API_KEY"))

    # 4. Numbered variants (GEMINI_API_KEY_1, GOOGLE_API_KEY_1, etc.)
    for env_name in sorted(os.environ):
        if env_name.startswith("GEMINI_API_KEY_") or env_name.startswith("GOOGLE_API_KEY_"):
            add_candidates(os.environ.get(env_name))

    # 5. Default embedded zero-cost keys
    for k in DEFAULT_GEMINI_KEYS:
        add_candidates(k)

    if not include_exhausted:
        keys = [k for k in keys if k not in EXHAUSTED_GEMINI_KEYS]

    return keys


def get_huggingface_tokens(config: argparse.Namespace | None = None, include_exhausted: bool = False) -> list[str]:
    """Return configured Hugging Face tokens in rotation order from CLI, comma lists, env vars, and default pool."""
    keys: list[str] = []
    seen: set[str] = set()

    def add_candidates(value: str | None) -> None:
        if not value:
            return
        for item in value.split(","):
            candidate = item.strip()
            if candidate and candidate not in seen:
                keys.append(candidate)
                seen.add(candidate)

    # 1. CLI token if specified
    cli_tokens = getattr(config, "hf_tokens", None) or []
    for k in cli_tokens:
        add_candidates(k)

    # 2. Comma-separated HF_TOKENS / HUGGINGFACE_API_KEYS
    add_candidates(os.environ.get("HF_TOKENS"))
    add_candidates(os.environ.get("HUGGINGFACE_API_KEYS"))

    # 3. Single HF_TOKEN / HUGGINGFACE_API_KEY
    add_candidates(os.environ.get("HF_TOKEN"))
    add_candidates(os.environ.get("HUGGINGFACE_API_KEY"))

    # 4. Numbered variants (HF_TOKEN_1, HF_TOKEN_2, etc.)
    for env_name in sorted(os.environ):
        if env_name.startswith("HF_TOKEN_") or env_name.startswith("HUGGINGFACE_API_KEY_"):
            add_candidates(os.environ.get(env_name))

    # 5. Default embedded token
    for k in DEFAULT_HF_TOKENS:
        add_candidates(k)

    if not include_exhausted:
        keys = [k for k in keys if k not in EXHAUSTED_HF_TOKENS]

    return keys


def probe_openrouter_key(api_key: str) -> tuple[bool, str]:
    """Return whether an OpenRouter key is authenticated and usable (supports both paid and free-tier accounts)."""
    if not api_key:
        return False, "empty key"

    # Step 1: Query OpenRouter's /api/v1/auth/key to test authentication and inspect account status
    auth_req = urllib.request.Request(
        "https://openrouter.ai/api/v1/auth/key",
        headers={
            "Authorization": f"Bearer {api_key}",
            "HTTP-Referer": "https://localhost",
            "X-Title": "DualBlind startup check",
            "User-Agent": "DualBlind-Headless-Runner/1.0",
        },
        method="GET",
    )
    try:
        with urllib.request.urlopen(auth_req, timeout=12) as response:
            body = response.read().decode("utf-8", errors="replace")
            parsed = json.loads(body)
            data = parsed.get("data") or {}
            if response.status == 200:
                is_free_tier = data.get("is_free_tier", False) or (data.get("limit") is None and data.get("usage", 0) == 0)
                if is_free_tier:
                    return True, "free-tier (:free models)"
                return True, "working"
    except urllib.error.HTTPError as e:
        if e.code in (401, 403):
            return False, f"Invalid or unauthorized OpenRouter key (HTTP {e.code})"
    except Exception:
        pass

    # Step 2: Probe with a verified 100% free model (0 credits required)
    payload = {
        "model": "meta-llama/llama-3.3-70b-instruct:free",
        "messages": [{"role": "user", "content": "Reply with only OK"}],
        "max_tokens": 5,
    }
    req = urllib.request.Request(
        "https://openrouter.ai/api/v1/chat/completions",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://localhost",
            "X-Title": "DualBlind startup check",
            "User-Agent": "DualBlind-Headless-Runner/1.0",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(req, timeout=20) as response:
            body = response.read().decode("utf-8", errors="replace")
            parsed = json.loads(body)
            choices = parsed.get("choices") or []
            if response.status == 200 and choices:
                return True, "working"
            return False, "unexpected response"
    except urllib.error.HTTPError as e:
        try:
            body = e.read().decode("utf-8", errors="replace")
            parsed = json.loads(body)
            err_msg = parsed.get("error") or parsed.get("message") or body
            if isinstance(err_msg, dict):
                err_msg = err_msg.get("message") or str(err_msg)
            msg_str = str(err_msg)
            # If the error is only about purchased credits, the key is still 100% valid for free models!
            if "never purchased credits" in msg_str.lower() or "insufficient credits" in msg_str.lower():
                return True, "free-tier (:free models)"
            return False, msg_str[:220]
        except Exception:
            return False, f"HTTP {e.code}: {str(e)}"[:220]
    except Exception as e:
        return False, str(e)[:220]


def prioritize_openrouter_keys(keys: list[str]) -> list[str]:
    """Reorder keys so working keys (both paid and free-tier) are accepted and ordered before invalid ones."""
    if not keys:
        return []

    ordered: list[str] = []
    failed: list[str] = []

    for key in keys:
        ok, reason = probe_openrouter_key(key)
        if ok:
            ordered.append(key)
            if "free-tier" in reason.lower():
                print(f"{GREEN}✓ OpenRouter key accepted (Free Tier): {key[:12]}...{RESET}")
            else:
                print(f"{GREEN}✓ OpenRouter key accepted: {key[:12]}...{RESET}")
        else:
            failed.append((key, reason))
            print(f"{YELLOW}⚠ OpenRouter key skipped: {key[:12]}... ({reason}){RESET}")

    return ordered + [key for key, _ in failed if key not in ordered]


def is_openrouter_rotation_error(error: Exception) -> bool:
    """Identify errors that commonly mean an OpenRouter key is rate-limited or exhausted."""
    message = str(error).lower()
    return any(
        marker in message
        for marker in (
            "http 429",
            "rate limit",
            "rate-limit",
            "quota",
            "credits",
            "insufficient balance",
            "free-models-per-day",
            "user has exceeded",
            "can only afford",
        )
    )


def is_gemini_rotation_error(error: Exception) -> bool:
    """Identify errors that commonly mean a Gemini key is rate-limited or exhausted."""
    message = str(error).lower()
    return any(
        marker in message
        for marker in (
            "http 429",
            "resourceexhausted",
            "quota",
            "rate limit",
            "rate-limit",
            "limit exceeded",
            "too many requests",
            "resource has been exhausted",
            "api_key_invalid",
            "api key not valid",
            "quota exceeded",
            "quota_exceeded",
        )
    )


def is_huggingface_rotation_error(error: Exception) -> bool:
    """Identify errors that commonly mean a Hugging Face token is rate-limited, exhausted, or rejected."""
    message = str(error).lower()
    return any(
        marker in message
        for marker in (
            "http 429",
            "rate limit",
            "rate-limit",
            "too many requests",
            "unauthorized",
            "http 401",
            "http 402",
            "402",
            "payment required",
            "depleted",
            "included credits",
            "monthly included credits",
            "purchase pre-paid credits",
            "not supported by any provider",
            "quota",
            "exceeded",
        )
    )


def is_timeout_error(error: Exception) -> bool:
    """Identify if an error is a network or socket read timeout."""
    message = str(error).lower()
    return any(
        marker in message
        for marker in (
            "timed out",
            "the read operation timed out",
            "timeout",
            "time out",
            "deadline exceeded",
            "connection timed out",
            "read timeout",
            "remotedisconnected",
        )
    )


def post_json(url: str, payload: dict, timeout: int = 120) -> dict:
    """Send a POST request with JSON body, extracting clear error bodies if HTTPError occurs."""
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
        raise RuntimeError(f"HTTP {e.code}: {err_msg}") from None


def get_json(url: str, timeout: int = 30) -> dict:
    """Send a GET request and parse JSON response, extracting clear error bodies if HTTPError occurs."""
    req = urllib.request.Request(
        url,
        headers={"User-Agent": "DualBlind-Headless-Runner/1.0"},
        method="GET",
    )
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
        raise RuntimeError(f"HTTP {e.code}: {err_msg}") from None


def countdown_pause(duration_seconds: int, reason: str = "") -> None:
    """Pause execution for duration_seconds with a live updating terminal countdown and clean Ctrl+C handling."""
    global RUNNING
    if duration_seconds <= 0 or not RUNNING:
        return

    mins = duration_seconds // 60
    secs = duration_seconds % 60
    time_str = f"{mins}m {secs:02d}s" if mins > 0 else f"{secs}s"

    print(f"\n{BOLD}{CYAN}{'='*80}{RESET}")
    print(f"{BOLD}{YELLOW}⏸  COOLDOWN PAUSE: {time_str}{RESET}")
    if reason:
        print(f"{CYAN}   Reason:{RESET} {reason}")
    print(f"{DIM}   Pausing to prevent provider rate limits / burst throttling. Press Ctrl+C to stop.{RESET}")
    print(f"{BOLD}{CYAN}{'='*80}{RESET}", flush=True)

    start_time = time.time()
    end_time = start_time + duration_seconds

    try:
        while RUNNING:
            remaining = int(end_time - time.time() + 0.99)
            if remaining <= 0:
                break
            rem_m = remaining // 60
            rem_s = remaining % 60
            progress = max(0.0, min(1.0, (duration_seconds - remaining) / float(duration_seconds)))
            bar_len = 24
            filled = int(progress * bar_len)
            bar = "█" * filled + "░" * (bar_len - filled)
            sys.stdout.write(
                f"\r{CYAN}   ⏳ Resuming in {BOLD}{rem_m:02d}:{rem_s:02d}{RESET}{CYAN} [{bar}] ({remaining}s remaining)...{RESET}   "
            )
            sys.stdout.flush()
            time.sleep(1)
        if RUNNING:
            sys.stdout.write(f"\r{GREEN}   ✓ Cooldown complete! Restarting and resuming benchmark runs now...{' '*20}\n\n{RESET}")
            sys.stdout.flush()
    except KeyboardInterrupt:
        RUNNING = False
        print(f"\n{YELLOW}[!] User interrupted cooldown pause. Exiting cleanly.{RESET}")


def get_live_openrouter_free_models(api_key: str) -> list[dict]:
    """Load currently available zero-cost OpenRouter model IDs."""
    if not api_key:
        return []
    req = urllib.request.Request(
        "https://openrouter.ai/api/v1/models",
        headers={
            "Authorization": f"Bearer {api_key}",
            "User-Agent": "DualBlind-Headless-Runner/1.0",
        },
        method="GET",
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as response:
            payload = json.loads(response.read().decode("utf-8"))
        models = []
        excluded_terms = (
            "agentic",
            "thinkingmachines/",
        )
        for item in payload.get("data", []):
            model_id = str(item.get("id", "")).strip()
            model_name = str(item.get("name", ""))
            model_description = str(item.get("description", ""))
            pricing = item.get("pricing") or {}
            if (
                model_id
                and model_id != "openrouter/free"
                and str(pricing.get("prompt", "")) == "0"
                and str(pricing.get("completion", "")) == "0"
                and not any(
                    term in f"{model_id} {model_name} {model_description}".lower()
                    for term in excluded_terms
                )
            ):
                models.append({
                    "model": model_id,
                    "provider": "openrouter",
                    "name": item.get("name") or model_id,
                    "family": "OpenRouter live free",
                })
        return models
    except Exception as error:
        print(f"{YELLOW}[!] Could not load OpenRouter's live free model list: {error}{RESET}")
        return []


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
        "model": "microsoft/phi-3-mini-128k-instruct:free",
        "provider": "openrouter",
        "name": "Phi 3 Mini Free",
        "family": "Microsoft",
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
        "model": "gemini-2.5-pro",
        "provider": "google",
        "name": "Gemini 2.5 Pro",
        "family": "Google",
    },
    # Hugging Face Serverless Free Tier Models
    {
        "model": "meta-llama/Llama-3.3-70B-Instruct",
        "provider": "huggingface",
        "name": "Llama 3.3 70B (Hugging Face)",
        "family": "Meta",
    },
    {
        "model": "deepseek-ai/DeepSeek-R1-Distill-Qwen-32B",
        "provider": "huggingface",
        "name": "DeepSeek R1 Distill Qwen 32B (Hugging Face)",
        "family": "DeepSeek",
    },
    {
        "model": "Qwen/Qwen2.5-72B-Instruct",
        "provider": "huggingface",
        "name": "Qwen 2.5 72B (Hugging Face)",
        "family": "Qwen",
    },
    {
        "model": "Qwen/Qwen2.5-Coder-32B-Instruct",
        "provider": "huggingface",
        "name": "Qwen 2.5 Coder 32B (Hugging Face)",
        "family": "Qwen",
    },
    {
        "model": "meta-llama/Llama-3.1-8B-Instruct",
        "provider": "huggingface",
        "name": "Llama 3.1 8B (Hugging Face)",
        "family": "Meta",
    },
    {
        "model": "deepseek-ai/DeepSeek-R1-Distill-Llama-70B",
        "provider": "huggingface",
        "name": "DeepSeek R1 Distill Llama 70B (Hugging Face)",
        "family": "DeepSeek",
    },
    {
        "model": "google/gemma-3-27b-it",
        "provider": "huggingface",
        "name": "Gemma 3 27B (Hugging Face)",
        "family": "Google",
    },
    # Ollama Local Models (100% Free & Local)
    {
        "model": "ollama/llama3.1:8b",
        "provider": "ollama",
        "name": "Llama 3.1 8B (Ollama Local)",
        "family": "Meta",
    },
    {
        "model": "ollama/deepseek-r1:8b",
        "provider": "ollama",
        "name": "DeepSeek R1 8B (Ollama Local)",
        "family": "DeepSeek",
    },
    {
        "model": "ollama/qwen2.5-coder:7b",
        "provider": "ollama",
        "name": "Qwen 2.5 Coder 7B (Ollama Local)",
        "family": "Qwen",
    },
    {
        "model": "ollama/gemma2:9b",
        "provider": "ollama",
        "name": "Gemma 2 9B (Ollama Local)",
        "family": "Google",
    },
    {
        "model": "ollama/smollm2:1.7b",
        "provider": "ollama",
        "name": "SmolLM2 1.7B (Ollama Local)",
        "family": "HuggingFaceTB",
    },
]


def is_model_free(model_name: str, provider: str = "") -> bool:
    """Check whether a model qualifies as zero-cost free tier."""
    if not model_name:
        return False
    m = model_name.lower().strip()
    if ":free" in m or m.endswith("/free") or m == "openrouter/free":
        return True
    if provider.lower() in ("huggingface", "hf") or m.startswith("hf:") or m.startswith("huggingface/"):
        return True
    if provider.lower() == "google" or m.startswith("gemini-") or m.startswith("google/"):
        if any(f in m for f in ["flash", "gemma", "exp"]):
            return True
    for entry in VERIFIED_FREE_MODELS:
        if entry["model"].lower() == m:
            return True
    return False


PAID_MODEL_POOL = [
    {"model": "gemini-2.5-flash", "provider": "google", "name": "Gemini 2.5 Flash", "family": "Google"},
    {"model": "gemini-2.5-pro", "provider": "google", "name": "Gemini 2.5 Pro", "family": "Google"},
    {"model": "gemini-1.5-flash", "provider": "google", "name": "Gemini 1.5 Flash", "family": "Google"},
    {"model": "google/gemini-2.5-flash", "provider": "openrouter", "name": "Gemini 2.5 Flash (OpenRouter)", "family": "Google"},
    {"model": "google/gemini-2.5-pro", "provider": "openrouter", "name": "Gemini 2.5 Pro (OpenRouter)", "family": "Google"},
    {"model": "deepseek/deepseek-chat-v3-0324", "provider": "openrouter", "name": "DeepSeek V3 Chat", "family": "DeepSeek"},
    {"model": "deepseek/deepseek-r1", "provider": "openrouter", "name": "DeepSeek R1", "family": "DeepSeek"},
    {"model": "qwen/qwen-2.5-72b-instruct", "provider": "openrouter", "name": "Qwen 2.5 72B Instruct", "family": "Qwen"},
    {"model": "openai/gpt-4o-mini", "provider": "openrouter", "name": "GPT-4o Mini", "family": "OpenAI"},
    {"model": "anthropic/claude-3.5-sonnet", "provider": "openrouter", "name": "Claude 3.5 Sonnet", "family": "Anthropic"},
    {"model": "meta-llama/llama-3.3-70b-instruct", "provider": "openrouter", "name": "Llama 3.3 70B Instruct", "family": "Meta"},
]


def select_trial_agents(config: argparse.Namespace, trial_num: int) -> tuple[dict, dict]:
    """Select Agent Alpha and Agent Beta for this trial, honoring the free-only flag and random pairing."""
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

    # Filter available model pool according to provider and paid/free policy
    provider_filter = getattr(config, "provider", "all").lower()
    force_free = bool(getattr(config, "force_free", True))

    if force_free:
        pool = list(VERIFIED_FREE_MODELS)
        has_google_key = bool(config.google_key or os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY"))
        if not has_google_key:
            pool = [m for m in pool if m["provider"] != "google"]
        if provider_filter in ("all", "openrouter", "routers", "both", "free-routers"):
            openrouter_keys = get_openrouter_keys(config)
            live_models = get_live_openrouter_free_models(openrouter_keys[0] if openrouter_keys else "")
            if live_models:
                existing_models = {m["model"] for m in pool}
                for lm in live_models:
                    if lm["model"] not in existing_models:
                        pool.append(lm)
    else:
        pool = list(PAID_MODEL_POOL)
        has_google_key = bool(config.google_key or os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY"))
        if not has_google_key and provider_filter != "google":
            pool = [m for m in pool if m["provider"] != "google"]

    if provider_filter in ("openrouter", "or"):
        pool = [m for m in pool if m["provider"] == "openrouter"]
    elif provider_filter in ("google", "gemini"):
        pool = [m for m in pool if m["provider"] == "google"]
    elif provider_filter in ("huggingface", "hf"):
        pool = [m for m in pool if m["provider"] == "huggingface"]
    elif provider_filter == "ollama":
        pool = [m for m in pool if m["provider"] == "ollama"]
    elif provider_filter in ("routers", "both", "free-routers", "openrouter,huggingface", "openrouter,hf", "hf,openrouter"):
        pool = [m for m in pool if m["provider"] in ("openrouter", "huggingface")]

    if not pool:
        pool = list(VERIFIED_FREE_MODELS if force_free else PAID_MODEL_POOL)

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
) -> dict:
    """Execute a complete multi-agent benchmark trial between Agent Alpha and Beta."""
    base_url = base_url.rstrip("/")
    problem_title = problem.get("title", "Untitled Problem")
    suite_id = problem.get("suiteId", problem.get("suite", "general"))

    # Determine agents for this trial
    if not agent_a or not agent_b:
        agent_a, agent_b = select_trial_agents(config, trial_num)

    tier_label = "100% Free Models Only" if bool(getattr(config, "force_free", True)) else "Paid & Free Models Allowed"
    print(f"\n{BOLD}{CYAN}{'='*80}{RESET}")
    print(f"{BOLD}{CYAN}[Trial #{trial_num}] {problem_title} ({str(suite_id).upper()}){RESET}")
    print(f"{DIM}Question: {problem.get('question', '')[:160]}...{RESET}")
    print(f"{BLUE}Agent Alpha:{RESET} {BOLD}{agent_a['name']}{RESET} [{agent_a['model']}] ({agent_a['provider']})")
    print(f"{MAGENTA}Agent Beta: {RESET} {BOLD}{agent_b['name']}{RESET} [{agent_b['model']}] ({agent_b['provider']})")
    print(f"{DIM}Tier: {tier_label}  |  Protocol: {'Uncapped' if config.uncapped else f'Max {config.max_turns} turns'}{RESET}")
    print(f"{CYAN}{'-'*80}{RESET}")

    # Gather API keys from CLI arguments, environment variables, or .env files
    api_keys = {}
    gemini_keys = get_gemini_keys(config)
    gemini_key_index = 0
    if gemini_keys:
        api_keys["google"] = gemini_keys[gemini_key_index]
        api_keys["googleKeys"] = gemini_keys

    openrouter_keys = get_openrouter_keys(config)
    openrouter_key_index = 0
    if openrouter_keys:
        api_keys["openrouter"] = openrouter_keys[openrouter_key_index]
        api_keys["openrouterKeys"] = openrouter_keys

    hf_tokens = get_huggingface_tokens(config)
    hf_token_index = 0
    if hf_tokens:
        api_keys["huggingface"] = hf_tokens[hf_token_index]
        api_keys["hfToken"] = hf_tokens[hf_token_index]
        api_keys["huggingfaceKeys"] = hf_tokens

    if config.openai_key or os.environ.get("OPENAI_API_KEY"):
        api_keys["openai"] = config.openai_key or os.environ.get("OPENAI_API_KEY")
    if config.anthropic_key or os.environ.get("ANTHROPIC_API_KEY"):
        api_keys["anthropic"] = config.anthropic_key or os.environ.get("ANTHROPIC_API_KEY")
    if config.deepseek_key or os.environ.get("DEEPSEEK_API_KEY"):
        api_keys["deepseek"] = config.deepseek_key or os.environ.get("DEEPSEEK_API_KEY")

    # Ollama / Google Colab Cloudflare Tunnel routing
    ollama_base = getattr(config, "ollama_url", None) or os.environ.get("OLLAMA_BASE_URL") or os.environ.get("COLAB_OLLAMA_URL")
    if ollama_base:
        api_keys["ollamaBaseUrl"] = ollama_base
        api_keys["ollamaUrl"] = ollama_base

    ollama_model_urls = {}
    for env_k, env_v in os.environ.items():
        if env_k.startswith("OLLAMA_URL_") and env_v.strip():
            ollama_model_urls[env_k] = env_v.strip()
            # Also register without prefix for direct model matching
            clean_m = env_k.replace("OLLAMA_URL_", "").lower()
            ollama_model_urls[clean_m] = env_v.strip()
    cli_model_urls = getattr(config, "ollama_model_urls", None) or []
    for item in cli_model_urls:
        if "=" in item:
            m_name, m_url = item.split("=", 1)
            ollama_model_urls[m_name.strip()] = m_url.strip()
    if ollama_model_urls:
        api_keys["ollamaUrls"] = ollama_model_urls

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

        turn_provider = current_agent.get("provider", "").lower()

        # Randomize Hugging Face token selection and introduce random timing intervals to prevent rate limits
        if ("huggingface" in turn_provider or "hf" in turn_provider):
            valid_hf_tokens = get_huggingface_tokens(config, include_exhausted=False)
            if valid_hf_tokens:
                random_hf_token = random.choice(valid_hf_tokens)
                api_keys["huggingface"] = random_hf_token
                api_keys["hfToken"] = random_hf_token
                api_keys["huggingfaceKeys"] = valid_hf_tokens

                min_delay = getattr(config, "hf_min_delay", 1.0) or 1.0
                max_delay = getattr(config, "hf_max_delay", 3.5) or 3.5
                if max_delay >= min_delay > 0:
                    random_delay = random.uniform(min_delay, max_delay)
                    if getattr(config, "verbose", False):
                        masked_token = f"...{random_hf_token[-6:]}" if len(random_hf_token) > 6 else "hf_***"
                        print(f"{CYAN}[HuggingFace] Selected random token ({masked_token}). Pausing {random_delay:.2f}s before request...{RESET}")
                    time.sleep(random_delay)

        turn_payload = {
            "problem": problem,
            "agent": current_agent,
            "partnerName": partner_name,
            "history": history_for_turn,
            "currentTurn": turn_num,
            "isUncapped": config.uncapped,
            "maxTurnsPerAgent": config.max_turns,
            "apiKeys": api_keys,
            "requireLive": True,
        }

        turn_start = time.time()
        turn_timeout = getattr(config, "turn_timeout", 120) or 120
        turn_retries_left = 3
        while True:
            try:
                res = post_json(f"{base_url}/api/benchmark/generate-turn", turn_payload, timeout=turn_timeout)
                break
            except Exception as turn_error:
                turn_provider = current_agent.get("provider", "").lower()

                # 1. Check for OpenRouter key quota/rate-limit rotation if current agent uses OpenRouter
                if "openrouter" in turn_provider and is_openrouter_rotation_error(turn_error):
                    failing_or_key = api_keys.get("openrouter")
                    if failing_or_key:
                        EXHAUSTED_OPENROUTER_KEYS.add(failing_or_key)
                    valid_or_keys = get_openrouter_keys(config, include_exhausted=False)
                    if valid_or_keys:
                        next_or_key = random.choice(valid_or_keys)
                        api_keys["openrouter"] = next_or_key
                        turn_payload["apiKeys"] = api_keys
                        print(
                            f"{YELLOW}[!] OpenRouter key error. Blacklisted key. Selected next valid key ({next_or_key[:12]}...). Retrying turn...{RESET}"
                        )
                        continue

                # 2. Check for Gemini key quota/rate-limit rotation if current agent uses Google/Gemini
                if ("google" in turn_provider or "gemini" in turn_provider) and is_gemini_rotation_error(turn_error):
                    failing_gemini_key = api_keys.get("google")
                    if failing_gemini_key:
                        EXHAUSTED_GEMINI_KEYS.add(failing_gemini_key)
                    valid_gemini_keys = get_gemini_keys(config, include_exhausted=False)
                    if valid_gemini_keys:
                        next_gemini_key = random.choice(valid_gemini_keys)
                        api_keys["google"] = next_gemini_key
                        turn_payload["apiKeys"] = api_keys
                        print(
                            f"{YELLOW}[!] Gemini key rate-limit/quota error. Blacklisted key. Selected next valid key ({next_gemini_key[:12]}...). Retrying turn...{RESET}"
                        )
                        continue

                # 3. Check for Hugging Face token rate-limit / depletion rotation if current agent uses Hugging Face
                if ("huggingface" in turn_provider or "hf" in turn_provider) and is_huggingface_rotation_error(turn_error):
                    failing_hf_key = api_keys.get("huggingface") or api_keys.get("hfToken")
                    if failing_hf_key:
                        EXHAUSTED_HF_TOKENS.add(failing_hf_key)

                    valid_hf_tokens = get_huggingface_tokens(config, include_exhausted=False)
                    if valid_hf_tokens:
                        next_hf_token = random.choice(valid_hf_tokens)
                        api_keys["huggingface"] = next_hf_token
                        api_keys["hfToken"] = next_hf_token
                        api_keys["huggingfaceKeys"] = valid_hf_tokens
                        turn_payload["apiKeys"] = api_keys
                        backoff_delay = random.uniform(2.5, 5.5)
                        masked_old = f"...{failing_hf_key[-6:]}" if failing_hf_key and len(failing_hf_key) > 6 else "hf_***"
                        masked_new = f"...{next_hf_token[-6:]}" if len(next_hf_token) > 6 else "hf_***"
                        print(
                            f"{YELLOW}[!] Hugging Face token ({masked_old}) error/depleted. Blacklisting key. Switching to valid random token ({masked_new}) after {backoff_delay:.1f}s delay...{RESET}"
                        )
                        time.sleep(backoff_delay)
                        continue
                    else:
                        all_count = len(get_huggingface_tokens(config, include_exhausted=True))
                        print(
                            f"{RED}[!] All {all_count} Hugging Face tokens are depleted or rate-limited! Retrying turn with backoff...{RESET}"
                        )

                # 4. Check for Socket / Network Read Timeout
                if is_timeout_error(turn_error):
                    turn_provider = current_agent.get("provider", "").lower()
                    if ("huggingface" in turn_provider or "hf" in turn_provider):
                        valid_tokens = get_huggingface_tokens(config, include_exhausted=False)
                        if valid_tokens:
                            next_token = random.choice(valid_tokens)
                            api_keys["huggingface"] = next_token
                            api_keys["hfToken"] = next_token
                            turn_payload["apiKeys"] = api_keys
                            backoff_delay = random.uniform(2.0, 5.0)
                            masked_token = f"...{next_token[-6:]}" if len(next_token) > 6 else "hf_***"
                            print(
                                f"{YELLOW}[!] Turn read timeout on Hugging Face. Rotating to random valid token ({masked_token}) and pausing {backoff_delay:.1f}s...{RESET}"
                            )
                            time.sleep(backoff_delay)
                            continue

                    # Otherwise retry with backoff
                    if turn_retries_left > 0:
                        turn_retries_left -= 1
                        backoff = 2.0 + (3 - turn_retries_left) * 1.5
                        print(
                            f"{YELLOW}[!] Turn read timeout ({turn_error}). Retrying turn in {backoff:.1f}s ({turn_retries_left} turn retries left)...{RESET}"
                        )
                        time.sleep(backoff)
                        continue

                raise
        turn_latency = int((time.time() - turn_start) * 1000)

        model_used = str(res.get("modelUsed", ""))
        if any(marker in model_used.lower() for marker in ("synthetic", "resilient", "offline")):
            raise RuntimeError(
                f"Server returned a non-live inference response ({model_used or 'unknown model'}); refusing to record this trial."
            )

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
            print(f"\n{BOLD}{agent_color}[Turn {turn_num+1}] {agent_label} ({model_used or current_agent['model']}):{RESET}", flush=True)
            print(content, flush=True)
        else:
            ans_tag = f" -> {GREEN}Claimed: [{extracted_answer}]{RESET}" if extracted_answer else ""
            preview = content.replace("\n", " ")[:90]
            print(f"  {agent_color}[Turn {turn_num+1:02d}] {agent_label} ({model_used or current_agent['model']}):{RESET} {preview}...{ans_tag}", flush=True)

        turns_data.append({
            "turnNumber": turn_num + 1,
            "agentId": current_agent_id,
            "agentName": current_agent["name"],
            "content": content,
            "modelUsed": model_used,
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
                print(f"\n{BOLD}{GREEN}✓ Consensus Reached! Both agents agreed on: [{final_answer}]{RESET}", flush=True)
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
        print(f"  {YELLOW}[!] Notice saving to leaderboard API: {e}{RESET}")

    # Save to local JSONL backup
    try:
        with open("arena_runs_local.jsonl", "a", encoding="utf-8") as f:
            f.write(json.dumps(run_record, ensure_ascii=False) + "\n")
    except Exception as e:
        print(f"  {YELLOW}[!] Local file write note: {e}{RESET}")

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


def main():
    global RUNNING
    parser = argparse.ArgumentParser(
        description="DualBlind AI Arena - Autonomous Resilient Headless Benchmark Runner"
    )
    parser.add_argument("--url", default="http://localhost:3000", help="Base URL of DualBlind server (default: http://localhost:3000)")
    parser.add_argument("--api-key", "--google-key", dest="google_key", default=None, help="Gemini API Key (default: GEMINI_API_KEY from environment or .env)")
    parser.add_argument(
        "--openrouter-key",
        dest="openrouter_keys",
        action="append",
        default=None,
        help="OpenRouter API key; repeat for rotation (or use OPENROUTER_API_KEYS, comma-separated)",
    )
    parser.add_argument(
        "--hf-token",
        "--huggingface-token",
        dest="hf_tokens",
        action="append",
        default=None,
        help="Hugging Face User Access Token (or HF_TOKEN/HF_TOKENS from environment)",
    )
    parser.add_argument("--hf-min-delay", type=float, default=1.0, help="Minimum random delay in seconds before Hugging Face requests (default: 1.0)")
    parser.add_argument("--hf-max-delay", type=float, default=3.5, help="Maximum random delay in seconds before Hugging Face requests (default: 3.5)")
    parser.add_argument("--ollama-url", "--colab-url", dest="ollama_url", default=None, help="Base URL of Ollama or Google Colab Cloudflare tunnel (e.g. https://xxx.trycloudflare.com/v1)")
    parser.add_argument("--ollama-model-url", dest="ollama_model_urls", action="append", default=None, help="Model-specific Colab endpoint mapping (e.g. --ollama-model-url llama3.1:8b=https://xxx.trycloudflare.com/v1)")
    parser.add_argument("--openai-key", default=None, help="OpenAI API Key (default: OPENAI_API_KEY from environment or .env)")
    parser.add_argument("--anthropic-key", default=None, help="Anthropic API Key (default: ANTHROPIC_API_KEY from environment or .env)")
    parser.add_argument("--deepseek-key", default=None, help="DeepSeek API Key (default: DEEPSEEK_API_KEY from environment or .env)")
    parser.add_argument(
        "--provider",
        default="all",
        choices=["all", "openrouter", "google", "huggingface", "hf", "ollama", "routers", "both"],
        help="Provider pool: all, openrouter, google, huggingface, or ollama (default: all)",
    )
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
    parser.add_argument("--turn-timeout", type=int, default=120, help="Per-turn inference timeout in seconds (default: 120)")
    parser.add_argument("--uncapped", action="store_true", help="Run in uncapped mode until natural consensus or loop cap")
    parser.add_argument("--count", type=int, default=0, help="Number of benchmark trials to run (0 for infinite loop)")
    parser.add_argument("--delay", type=float, default=2.0, help="Cooling delay in seconds between trials (default: 2.0)")
    parser.add_argument(
        "--batch-size",
        type=int,
        default=5,
        help="Number of benchmark trials to run before taking a cooldown pause (default: 5)",
    )
    parser.add_argument(
        "--batch-pause",
        type=int,
        default=120,
        help="Cooldown pause duration in seconds after every batch of runs (default: 120s / 2 minutes)",
    )
    parser.add_argument(
        "--pause-minutes",
        type=float,
        default=None,
        help="Alternative flag to set cooldown pause in minutes (e.g. --pause-minutes 2)",
    )
    parser.add_argument("--verbose", action="store_true", help="Print full conversational transcripts for each agent turn")
    parser.add_argument("--restart-delay", type=int, default=8, help="Seconds to wait before auto-restarting on fatal crash (default: 8)")

    args = parser.parse_args()

    if args.pause_minutes is not None:
        args.batch_pause = max(5, int(args.pause_minutes * 60))

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
    resolved_openrouter_keys = prioritize_openrouter_keys(get_openrouter_keys(args))
    if resolved_openrouter_keys:
        os.environ["OPENROUTER_API_KEY"] = resolved_openrouter_keys[0]
        os.environ["OPENROUTER_API_KEYS"] = ",".join(resolved_openrouter_keys)
    resolved_hf_tokens = get_huggingface_tokens(args)

    print(f"{BOLD}{GREEN}======================================================{RESET}")
    print(f"{BOLD}{GREEN}   DualBlind AI Arena - Autonomous Headless Runner   {RESET}")
    print(f"{BOLD}{GREEN}======================================================{RESET}")
    print(f"Target Server:   {CYAN}{args.url}{RESET}")
    print(f"Cost Policy:     {BOLD}{GREEN}100% FREE ONLY (Enforced Zero-Cost){RESET}" if args.force_free else f"{YELLOW}Paid & Free Models Allowed{RESET}")
    print(f"Model Selection: {BOLD}{MAGENTA}Randomized Multi-Model Deliberations{RESET}" if args.random_models else f"Fixed: {args.model_a} vs {args.model_b}")
    print(f"Provider Scope:  {BOLD}{CYAN}{args.provider.upper()}{RESET} ({'OpenRouter (:free), Google Flash & HF' if args.provider == 'all' else args.provider})")
    print(f"Suite Filter:    {args.suite}")
    print(f"Protocol:        {'Uncapped Deliberation' if args.uncapped else f'Max {args.max_turns} turns'}")
    batch_mins = args.batch_pause / 60.0
    print(f"Batch Cooldown:  Pause {args.batch_pause}s ({batch_mins:.1f}m) after every {args.batch_size} runs")
    print(f"Keys Detected:")
    print(f"  • Google (Gemini):     {GREEN}✓ Loaded (Active){RESET}" if resolved_google_key else f"  • Google (Gemini):     {YELLOW}○ None detected in environment{RESET}")
    print(
        f"  • OpenRouter (Universal): {GREEN}✓ Loaded ({len(resolved_openrouter_keys)} key{'s' if len(resolved_openrouter_keys) != 1 else ''}, rotating on quota/rate limits){RESET}"
        if resolved_openrouter_keys
        else f"  • OpenRouter (Universal): {YELLOW}○ None detected (Free tier / server fallback active){RESET}"
    )
    print(
        f"  • Hugging Face:         {GREEN}✓ Loaded ({len(resolved_hf_tokens)} token{'s' if len(resolved_hf_tokens) != 1 else ''}, rotating on quota/rate limits){RESET}"
        if resolved_hf_tokens
        else f"  • Hugging Face:         {YELLOW}○ None detected (HF_TOKEN / --hf-token){RESET}"
    )
    print(f"Self-Healing:    Active (Auto-restart on any fatal network or API drop)")
    print(f"Local Backup:    arena_runs_local.jsonl")
    print(f"{GREEN}------------------------------------------------------{RESET}\n")

    if args.provider in ("huggingface", "hf") and not resolved_hf_tokens:
        print(f"{YELLOW}[!] Notice: Running --provider huggingface with no local HF token detected.{RESET}")
        print(f"    Provide your Hugging Face user access token via:")
        print(f"    {CYAN}python3 scripts/arena_runner.py --hf-token hf_... --provider huggingface --url {args.url}{RESET}")
        print(f"    Note: Hugging Face router includes $0.10 monthly credits for free accounts.")
        print(f"    For 100% free unlimited runs, OpenRouter with free models is recommended:")
        print(f"    {CYAN}python3 scripts/arena_runner.py --provider openrouter --force-free --url {args.url}{RESET}\n")
    elif not resolved_google_key and not resolved_openrouter_keys and "localhost" not in args.url:
        print(f"{YELLOW}[i] Pro-tip for Remote Server runs:{RESET}")
        print(f"    Pass your key directly on the CLI:")
        print(f"    {CYAN}python3 arena_runner.py --url {args.url} --openrouter-key YOUR_OPENROUTER_KEY{RESET}")
        print(f"    {CYAN}python3 arena_runner.py --url {args.url} --api-key YOUR_GEMINI_KEY{RESET}\n")

    restart_count = 0
    trial_counter = 0

    # Self-Healing Supervisor Loop: Automatically catches all errors and restarts!
    while RUNNING:
        try:
            problems = fetch_problems(args.url, args.suite)
            print(f"{GREEN}✓ Loaded {len(problems)} benchmark problems from suite '{args.suite}'. Starting runner...{RESET}\n")

            while RUNNING:
                for problem in problems:
                    if not RUNNING:
                        break
                    trial_counter += 1

                    trial_succeeded = False
                    cooldown_performed = False

                    try:
                        run_trial(args.url, problem, args, trial_counter)
                        trial_succeeded = True
                    except Exception as trial_err:
                        err_str = str(trial_err)
                        print(f"\n{YELLOW}[!] Warning: Trial #{trial_counter} encountered: {err_str}{RESET}")
                        is_rate_or_quota = any(
                            marker in err_str.lower()
                            for marker in (
                                "depleted your monthly included credits",
                                "402",
                                "payment required",
                                "429",
                                "rate limit",
                                "rate-limit",
                                "too many requests",
                                "free-models-per-day",
                                "quota",
                                "credits",
                                "resourceexhausted",
                                "503",
                                "loading",
                            )
                        )

                        if is_rate_or_quota:
                            mins = args.batch_pause // 60
                            secs = args.batch_pause % 60
                            dur_str = f"{mins}m {secs:02d}s" if mins > 0 else f"{secs}s"
                            print(f"\n{YELLOW}{BOLD}    [RATE LIMIT / BURST COOLDOWN TRIGGERED]{RESET}")
                            print(f"{YELLOW}    Encountered provider rate limit or quota window on trial #{trial_counter}.{RESET}")
                            print(f"{CYAN}    Pausing for {dur_str} to refresh rate limit buckets before auto-restarting and resuming...{RESET}")
                            if "depleted your monthly included credits" in err_str.lower() or "(402)" in err_str:
                                print(f"{DIM}    (Tip: You can also switch to Google's free tier with --provider google --force-free){RESET}")
                            countdown_pause(
                                args.batch_pause,
                                reason=f"Provider rate-limit cooldown after trial #{trial_counter}. Auto-restarting in {dur_str}...",
                            )
                            cooldown_performed = True
                        else:
                            if "GEMINI_API_KEY" in err_str:
                                print(f"{YELLOW}    [→] Missing API Key: Pass --api-key YOUR_KEY or set export GEMINI_API_KEY=YOUR_KEY{RESET}")
                            print(f"{DIM}    Continuing to next problem in {args.delay}s...{RESET}")
                            time.sleep(args.delay)

                    if args.count > 0 and trial_counter >= args.count:
                        print(f"\n{BOLD}{GREEN}✓ Target trial count of {args.count} completed successfully.{RESET}")
                        return

                    # Batch Cooldown: Pause for a couple of minutes after every 5 runs and restart
                    if RUNNING and args.batch_size > 0 and (trial_counter % args.batch_size == 0) and not cooldown_performed:
                        mins = args.batch_pause // 60
                        secs = args.batch_pause % 60
                        dur_str = f"{mins}m {secs:02d}s" if mins > 0 else f"{secs}s"
                        countdown_pause(
                            args.batch_pause,
                            reason=f"Completed batch of {args.batch_size} trials (Total runs: {trial_counter}). Cooling down for {dur_str} before starting next batch.",
                        )
                    elif RUNNING and args.delay > 0 and trial_succeeded:
                        time.sleep(args.delay)

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
