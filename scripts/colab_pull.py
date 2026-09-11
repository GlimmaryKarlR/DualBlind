#!/usr/bin/env python3
"""
DualBlind Colab Model Manager
Inspects, pulls, and manages Ollama models on your remote Google Colab GPU instance
via the Cloudflare tunnel without needing to open the Colab tab.
"""

import sys
import os
import argparse
import json
import urllib.request
import urllib.error

# ANSI Colors
GREEN = "\033[92m"
CYAN = "\033[96m"
YELLOW = "\033[93m"
RED = "\033[91m"
BOLD = "\033[1m"
DIM = "\033[2m"
RESET = "\033[0m"

# Colab T4 GPU (15GB VRAM) Recommended Models
T4_RECOMMENDED_MODELS = {
    "deepseek-r1:14b": {"size": "9.0 GB", "desc": "DeepSeek R1 14B Distill (Math/Reasoning SOTA)"},
    "deepseek-r1:8b": {"size": "4.9 GB", "desc": "DeepSeek R1 8B Distill (Fast Reasoning)"},
    "qwen2.5-coder:14b": {"size": "9.0 GB", "desc": "Qwen 2.5 Coder 14B (SOTA Open Code Model)"},
    "qwen2.5-coder:7b": {"size": "4.4 GB", "desc": "Qwen 2.5 Coder 7B (Fast Coding)"},
    "phi4:14b": {"size": "9.1 GB", "desc": "Microsoft Phi-4 14B (Complex Logic & Math)"},
    "mistral-nemo:12b": {"size": "7.1 GB", "desc": "Mistral NeMo 12B (128k Context)"},
    "gemma2:9b": {"size": "5.4 GB", "desc": "Google Gemma 2 9B (High-Precision Generalist)"},
    "llama3.1:8b": {"size": "4.6 GB", "desc": "Meta Llama 3.1 8B (Classic Standard)"},
    "smollm2:1.7b": {"size": "1.8 GB", "desc": "SmolLM2 1.7B (Ultra-Fast 50+ t/s)"},
}

def resolve_url(args_url: str = None) -> str:
    url = args_url or os.environ.get("OLLAMA_BASE_URL", "")
    if not url:
        # Check .env.local
        env_paths = [".env.local", ".env"]
        for p in env_paths:
            if os.path.exists(p):
                with open(p, "r") as f:
                    for line in f:
                        if line.startswith("OLLAMA_BASE_URL="):
                            url = line.split("=", 1)[1].strip().strip('"').strip("'")
                            break
            if url:
                break
    if not url:
        print(f"{RED}Error: Colab Ollama URL not found.{RESET}")
        print("Please provide --url https://<your-subdomain>.trycloudflare.com or set OLLAMA_BASE_URL in .env.local")
        sys.exit(1)
    
    # Strip trailing /v1 or /
    clean = url.rstrip("/")
    if clean.endswith("/v1"):
        clean = clean[:-3]
    return clean

def list_installed_models(base_url: str):
    tags_url = f"{base_url}/api/tags"
    req = urllib.request.Request(tags_url, headers={"User-Agent": "DualBlind-Manager/1.0"})
    try:
        with urllib.request.urlopen(req, timeout=15) as res:
            data = json.loads(res.read().decode("utf-8"))
            models = data.get("models", [])
            print(f"\n{BOLD}{CYAN}=== MODELS INSTALLED ON COLAB GPU ({len(models)}) ==={RESET}")
            total_size_gb = 0.0
            for m in models:
                name = m.get("name", "unknown")
                size_gb = m.get("size", 0) / (1024**3)
                total_size_gb += size_gb
                details = m.get("details", {})
                param_size = details.get("parameter_size", "")
                quant = details.get("quantization_level", "")
                print(f"  • {BOLD}{GREEN}{name:<22}{RESET} {size_gb:>5.1f} GB  [{param_size or 'N/A'}, {quant or 'N/A'}]")
            print(f"{DIM}------------------------------------------------------{RESET}")
            print(f"  Total Colab Disk Used: {BOLD}{total_size_gb:.1f} GB{RESET} (of ~75 GB available)\n")
            return [m.get("name") for m in models]
    except Exception as e:
        print(f"{RED}Failed to connect to Colab Ollama server at {base_url}: {e}{RESET}")
        return []

def pull_model(base_url: str, model_name: str):
    print(f"\n{YELLOW}==> Requesting Colab to download '{model_name}'...{RESET}")
    print(f"{DIM}Streaming model layers over Google datacenter pipe to Colab NVMe disk...{RESET}")
    pull_url = f"{base_url}/api/pull"
    payload = json.dumps({"name": model_name, "stream": True}).encode("utf-8")
    req = urllib.request.Request(
        pull_url,
        data=payload,
        headers={"Content-Type": "application/json", "User-Agent": "DualBlind-Manager/1.0"}
    )
    try:
        with urllib.request.urlopen(req, timeout=600) as res:
            last_status = ""
            for raw_line in res:
                if not raw_line:
                    continue
                line = raw_line.decode("utf-8").strip()
                if not line:
                    continue
                try:
                    event = json.loads(line)
                    status = event.get("status", "")
                    total = event.get("total", 0)
                    completed = event.get("completed", 0)
                    if total > 0:
                        pct = (completed / total) * 100
                        mb_done = completed / (1024 * 1024)
                        mb_total = total / (1024 * 1024)
                        sys.stdout.write(f"\r{CYAN}  [{model_name}] {status}: {mb_done:.0f}MB / {mb_total:.0f}MB ({pct:.1f}%){RESET}   ")
                        sys.stdout.flush()
                    elif status != last_status:
                        print(f"  [{model_name}] {status}")
                        last_status = status
                except Exception:
                    pass
            print(f"\n{GREEN}✓ Successfully downloaded and activated '{model_name}' on Colab GPU!{RESET}")
    except Exception as e:
        print(f"\n{RED}Error pulling '{model_name}': {e}{RESET}")

def main():
    parser = argparse.ArgumentParser(description="DualBlind Colab Model Manager")
    parser.add_argument("--url", help="Colab Cloudflare tunnel URL (e.g. https://xxx.trycloudflare.com)")
    parser.add_argument("--list", action="store_true", help="List all models currently installed on Colab")
    parser.add_argument("--pull", help="Model tag to download (e.g. gemma2:9b, phi4:14b, deepseek-r1:14b)")
    parser.add_argument("--pack", choices=["all_small", "reasoning", "coding"], help="Download a pre-curated pack of models")
    args = parser.parse_args()

    base_url = resolve_url(args.url)
    print(f"{CYAN}Connected to Colab Ollama Host:{RESET} {BOLD}{base_url}{RESET}")

    if args.pull:
        pull_model(base_url, args.pull)
        list_installed_models(base_url)
    elif args.pack == "all_small":
        for m in ["llama3.1:8b", "deepseek-r1:8b", "qwen2.5-coder:7b", "smollm2:1.7b"]:
            pull_model(base_url, m)
        list_installed_models(base_url)
    elif args.pack == "reasoning":
        for m in ["deepseek-r1:14b", "phi4:14b"]:
            pull_model(base_url, m)
        list_installed_models(base_url)
    elif args.pack == "coding":
        for m in ["qwen2.5-coder:14b", "qwen2.5-coder:7b"]:
            pull_model(base_url, m)
        list_installed_models(base_url)
    else:
        list_installed_models(base_url)
        print(f"{BOLD}Recommended Models to Pull into Colab T4 GPU:{RESET}")
        for name, meta in T4_RECOMMENDED_MODELS.items():
            print(f"  • {CYAN}{name:<20}{RESET} ({meta['size']}) - {meta['desc']}")
        print(f"\n{DIM}To pull any model remotely:{RESET}")
        print(f"  python3 scripts/colab_pull.py --pull <model_name>\n")

if __name__ == "__main__":
    main()
