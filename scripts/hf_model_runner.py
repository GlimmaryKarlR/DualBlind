#!/usr/bin/env python3
"""
Hugging Face Model Runner for DualBlind AI Benchmark
=====================================================
Executes inference on Hugging Face models using:
1. Hugging Face Serverless Router API (https://router.huggingface.co/v1/chat/completions)
2. Custom Hugging Face Spaces / Dedicated Inference Endpoints (https://<space>.hf.space/v1)
3. DualBlind Benchmark Server execution (/api/evaluate-turn)

Zero external dependencies (uses standard library urllib, json, os, sys, argparse).

Usage Examples:
---------------
# 1. Quick test prompt via HF Router
python3 scripts/hf_model_runner.py --model meta-llama/Llama-3.3-70B-Instruct --prompt "Solve: 15 * 14"

# 2. Test model hosted on your HF Space / Dedicated Endpoint
python3 scripts/hf_model_runner.py \
    --space-url "https://my-user-space.hf.space/v1" \
    --model "meta-llama/Llama-3.1-8B-Instruct" \
    --prompt "What is quantum computing?"

# 3. Interactive terminal chat mode
python3 scripts/hf_model_runner.py --interactive

# 4. Verify HF Token authentication status
python3 scripts/hf_model_runner.py --whoami

# 5. Run a DualBlind benchmark trial using HF models against local server
python3 scripts/hf_model_runner.py --benchmark --url http://localhost:3000
"""

import argparse
import json
import os
import sys
import time
import urllib.error
import urllib.request

# ANSI Colors
GREEN = "\033[92m"
YELLOW = "\033[93m"
CYAN = "\033[96m"
RED = "\033[91m"
BOLD = "\033[1m"
RESET = "\033[0m"

DEFAULT_HF_ROUTER = "https://router.huggingface.co/v1/chat/completions"

POPULAR_HF_MODELS = [
    "meta-llama/Llama-3.3-70B-Instruct",
    "deepseek-ai/DeepSeek-R1-Distill-Qwen-32B",
    "deepseek-ai/DeepSeek-R1-Distill-Llama-70B",
    "Qwen/Qwen2.5-Coder-32B-Instruct",
    "Qwen/Qwen2.5-72B-Instruct",
    "mistralai/Mistral-Small-24B-Instruct-2501",
    "google/gemma-2-27b-it",
    "microsoft/Phi-3.5-mini-instruct",
    "HuggingFaceTB/SmolLM2-1.7B-Instruct",
]


def load_env_file(filepath: str) -> dict[str, str]:
    """Parse key-value pairs from .env files without requiring python-dotenv."""
    env_vars = {}
    if not os.path.exists(filepath):
        return env_vars
    try:
        with open(filepath, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                key, val = line.split("=", 1)
                val = val.strip().strip("'\"")
                env_vars[key.strip()] = val
    except Exception:
        pass
    return env_vars


def get_hf_token(cli_token: str | None = None) -> str:
    """Retrieve HF Token from CLI arg, environment, or .env files."""
    if cli_token:
        return cli_token.strip()

    # Read from environment
    for env_key in ["HF_TOKEN", "HUGGINGFACE_HUB_TOKEN", "HUGGINGFACE_TOKEN", "HUGGING_FACE_HUB_TOKEN"]:
        val = os.environ.get(env_key)
        if val and val.strip():
            return val.strip()

    # Read from .env / .env.local
    cwd = os.getcwd()
    for env_filename in [".env.local", ".env"]:
        env_path = os.path.join(cwd, env_filename)
        parsed = load_env_file(env_path)
        for env_key in ["HF_TOKEN", "HUGGINGFACE_HUB_TOKEN", "HUGGINGFACE_TOKEN", "HUGGINGFACE_API_KEY"]:
            if parsed.get(env_key):
                return parsed[env_key]

    return ""


def check_hf_whoami(token: str) -> None:
    """Verify HF token with Hugging Face API."""
    if not token:
        print(f"{RED}[!] Error: No HF token found. Pass --token hf_... or set HF_TOKEN environment variable.{RESET}")
        return

    req = urllib.request.Request(
        "https://huggingface.co/api/whoami-v2",
        headers={"Authorization": f"Bearer {token}"}
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            user = data.get("name", "Unknown")
            email = data.get("email", "N/A")
            orgs = [o.get("name") for o in data.get("orgs", [])]
            print(f"{GREEN}[✓] Hugging Face Authentication Successful!{RESET}")
            print(f"    {BOLD}User:{RESET} {user} ({email})")
            if orgs:
                print(f"    {BOLD}Organizations:{RESET} {', '.join(orgs)}")
    except urllib.error.HTTPError as e:
        print(f"{RED}[!] HF Auth Failed (HTTP {e.code}): {e.reason}{RESET}")
    except Exception as e:
        print(f"{RED}[!] Connection error: {e}{RESET}")


def execute_hf_chat(
    token: str,
    model: str,
    prompt: str,
    endpoint: str = DEFAULT_HF_ROUTER,
    system_prompt: str = "You are a helpful AI assistant.",
    temperature: float = 0.4,
    max_tokens: int = 2048,
    verbose: bool = True
) -> str:
    """Send chat request to Hugging Face Router or Space OpenAI-compatible endpoint."""
    if not endpoint.endswith("/chat/completions"):
        endpoint = endpoint.rstrip("/") + "/chat/completions"

    headers = {
        "Content-Type": "application/json",
        "HTTP-Referer": "https://dual-blind.vercel.app",
        "X-Title": "DualBlind AI Benchmark",
    }
    if token:
        headers["Authorization"] = f"Bearer {token}"

    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": prompt}
        ],
        "temperature": temperature,
        "max_tokens": max_tokens
    }

    if verbose:
        print(f"{CYAN}[➜] Sending request to {endpoint}{RESET}")
        print(f"    {BOLD}Model:{RESET} {model}")
        print(f"    {BOLD}Prompt:{RESET} {prompt[:80]}...")

    start_time = time.time()
    req = urllib.request.Request(
        endpoint,
        data=json.dumps(payload).encode("utf-8"),
        headers=headers,
        method="POST"
    )

    try:
        with urllib.request.urlopen(req, timeout=90) as resp:
            elapsed = time.time() - start_time
            body = json.loads(resp.read().decode("utf-8"))
            
            choices = body.get("choices", [])
            if not choices:
                raise ValueError(f"No choices in HF response: {body}")
            
            content = choices[0].get("message", {}).get("content", "")
            usage = body.get("usage", {})
            prompt_tokens = usage.get("prompt_tokens", 0)
            completion_tokens = usage.get("completion_tokens", 0)

            if verbose:
                print(f"{GREEN}[✓] Response received in {elapsed:.2f}s ({prompt_tokens} prompt + {completion_tokens} completion tokens):{RESET}\n")
            return content

    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8", errors="ignore")
        if verbose:
            print(f"{RED}[!] HTTP {e.code} Error from HF Endpoint:{RESET} {err_body[:300]}")
        raise RuntimeError(f"HTTP {e.code}: {err_body[:200]}")
    except Exception as e:
        if verbose:
            print(f"{RED}[!] Exception during HF inference:{RESET} {e}")
        raise e


def run_benchmark_trial(server_url: str, hf_token: str, model_name: str) -> None:
    """Trigger a DualBlind benchmark turn using the HF model on the local or remote server."""
    endpoint = f"{server_url.rstrip('/')}/api/evaluate-turn"
    print(f"{CYAN}[➜] Triggering DualBlind benchmark evaluation turn on {endpoint}{RESET}")

    payload = {
        "problem": {
            "id": "hf_test_1",
            "title": "Quantum Algorithm Complexity",
            "question": "What is the time complexity of Grover's search algorithm compared to classical unstructured search?",
            "topic": "Computer Science & Physics",
            "difficulty": "Hard",
            "expectedFormat": "Definitive explanation with asymptotic bounds"
        },
        "agent": {
            "id": "agent_hf_a",
            "name": "Hugging Face Model",
            "model": model_name if model_name.startswith("hf:") else f"hf:{model_name}",
            "provider": "huggingface",
            "temperature": 0.4
        },
        "partnerName": "Gemini 3.7 Flash",
        "history": [],
        "currentTurn": 0,
        "apiKeys": {
            "huggingface": hf_token
        },
        "requireLive": True
    }

    req = urllib.request.Request(
        endpoint,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST"
    )

    start_time = time.time()
    try:
        with urllib.request.urlopen(req, timeout=90) as resp:
            elapsed = time.time() - start_time
            res = json.loads(resp.read().decode("utf-8"))
            print(f"{GREEN}[✓] DualBlind Turn Evaluated in {elapsed:.2f}s!{RESET}")
            print(f"    {BOLD}Model Used:{RESET} {res.get('modelUsed')}")
            print(f"    {BOLD}Response Preview:{RESET}\n{res.get('text', '')[:300]}...")
    except Exception as e:
        print(f"{RED}[!] DualBlind server request failed:{RESET} {e}")


def main():
    parser = argparse.ArgumentParser(description="Hugging Face Model Runner for DualBlind AI Benchmark")
    parser.add_argument("--token", "--hf-token", dest="token", help="Hugging Face User Access Token (hf_...)")
    parser.add_argument("--model", default="meta-llama/Llama-3.3-70B-Instruct", help="Hugging Face Model Repo ID")
    parser.add_argument("--prompt", help="Prompt text to send to the model")
    parser.add_argument("--space-url", help="Custom HF Space or Dedicated Endpoint Base URL (e.g. https://<space>.hf.space/v1)")
    parser.add_argument("--whoami", action="store_true", help="Verify Hugging Face token identity")
    parser.add_argument("--list-models", action="store_true", help="List popular Hugging Face benchmark models")
    parser.add_argument("--interactive", "-i", action="store_true", help="Start interactive terminal chat session")
    parser.add_argument("--benchmark", action="store_true", help="Run a test benchmark turn on DualBlind server")
    parser.add_argument("--model-b", default="gemini-3.7-flash", help="Opponent model for arena benchmark (default: gemini-3.7-flash)")
    parser.add_argument("--arena", action="store_true", help="Launch full arena_runner.py benchmark loop on this model")
    parser.add_argument("--count", type=int, default=5, help="Number of trials for --arena run (default: 5)")
    parser.add_argument("--url", default="http://localhost:3000", help="DualBlind server URL (default: http://localhost:3000)")
    
    args = parser.parse_args()

    token = get_hf_token(args.token)

    if args.whoami:
        check_hf_whoami(token)
        return

    if args.list_models:
        print(f"{BOLD}Popular Hugging Face Benchmark Models:{RESET}")
        for m in POPULAR_HF_MODELS:
            print(f"  • {m}")
        return

    if args.benchmark:
        run_benchmark_trial(args.url, token, args.model)
        return

    if args.arena:
        # Launch arena_runner.py targeting the HF model
        model_a_flag = args.model if args.model.startswith("hf:") else f"hf:{args.model}"
        cmd = [
            sys.executable,
            "scripts/arena_runner.py",
            "--url", args.url,
            "--model-a", model_a_flag,
            "--model-b", args.model_b,
            "--fixed-models",
            "--count", str(args.count),
            "--verbose"
        ]
        if token:
            cmd.extend(["--hf-token", token])
        
        print(f"{CYAN}[➜] Launching DualBlind Arena Runner on model: {model_a_flag} vs {args.model_b}{RESET}")
        print(f"    Command: {' '.join(cmd)}")
        os.execv(sys.executable, cmd)


    endpoint = args.space_url if args.space_url else DEFAULT_HF_ROUTER

    if args.interactive:
        print(f"{BOLD}{GREEN}=== DualBlind Hugging Face Model Terminal ==={RESET}")
        print(f"Model: {CYAN}{args.model}{RESET}")
        print(f"Endpoint: {CYAN}{endpoint}{RESET}")
        print("Type your message and press Enter (or type 'exit' / 'quit' to end):\n")

        while True:
            try:
                user_input = input(f"{BOLD}User > {RESET}").strip()
                if user_input.lower() in ("exit", "quit"):
                    print("Goodbye!")
                    break
                if not user_input:
                    continue

                response = execute_hf_chat(
                    token=token,
                    model=args.model,
                    prompt=user_input,
                    endpoint=endpoint,
                    verbose=False
                )
                print(f"\n{BOLD}{GREEN}Model ({args.model}) >{RESET}\n{response}\n")
            except KeyboardInterrupt:
                print("\nSession interrupted.")
                break
            except Exception as e:
                print(f"{RED}Error: {e}{RESET}\n")
        return

    # Default to prompt or sample prompt
    prompt = args.prompt if args.prompt else "State the 3 main laws of thermodynamics concisely."
    try:
        output = execute_hf_chat(
            token=token,
            model=args.model,
            prompt=prompt,
            endpoint=endpoint,
            verbose=True
        )
        print(output)
    except Exception as e:
        sys.exit(1)


if __name__ == "__main__":
    main()
