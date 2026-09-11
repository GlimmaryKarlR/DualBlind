#!/usr/bin/env python3
"""
DualBlind Colab Model & Cluster Manager
Inspects, pulls, and manages Ollama models across single or multiple remote
Google Colab GPU instances via Cloudflare tunnels without opening the Colab tabs.
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
MAGENTA = "\033[95m"
BOLD = "\033[1m"
DIM = "\033[2m"
RESET = "\033[0m"

# Colab T4 GPU (15GB VRAM) Recommended Models
T4_RECOMMENDED_MODELS = {
    "deepseek-r1:14b": {"size": "9.0 GB", "desc": "DeepSeek R1 14B Distill (Math/Reasoning SOTA)"},
    "qwen2.5-coder:14b": {"size": "9.0 GB", "desc": "Qwen 2.5 Coder 14B (SOTA Open Code Model)"},
    "phi4:14b": {"size": "8.4 GB", "desc": "Microsoft Phi-4 14B (Complex Logic & Math)"},
    "mistral-nemo:12b": {"size": "7.1 GB", "desc": "Mistral NeMo 12B (128k Context)"},
    "gemma2:9b": {"size": "5.1 GB", "desc": "Google Gemma 2 9B (High-Precision Generalist)"},
    "deepseek-r1:8b": {"size": "4.9 GB", "desc": "DeepSeek R1 8B Distill (Fast Reasoning)"},
    "llama3.1:8b": {"size": "4.6 GB", "desc": "Meta Llama 3.1 8B (Classic Standard)"},
    "qwen2.5-coder:7b": {"size": "4.4 GB", "desc": "Qwen 2.5 Coder 7B (Fast Coding)"},
    "smollm2:1.7b": {"size": "1.7 GB", "desc": "SmolLM2 1.7B (Ultra-Fast 50+ t/s)"},
}

def clean_url(url: str) -> str:
    clean = (url or "").strip().rstrip("/")
    if clean.endswith("/v1"):
        clean = clean[:-3]
    return clean

def load_env_urls() -> dict[int, str]:
    """Read configured Colab URLs from .env.local and environment variables."""
    nodes = {}
    env_paths = [".env.local", ".env"]
    for p in env_paths:
        if os.path.exists(p):
            try:
                with open(p, "r") as f:
                    for line in f:
                        line = line.strip()
                        if not line or line.startswith("#") or "=" not in line:
                            continue
                        k, v = line.split("=", 1)
                        k = k.strip()
                        v = v.strip().strip('"').strip("'")
                        if not v:
                            continue
                        if k in ("OLLAMA_BASE_URL", "COLAB_URL_1", "OLLAMA_BASE_URL_1", "COLAB_OLLAMA_URL"):
                            nodes[1] = clean_url(v)
                        elif k in ("COLAB_URL_2", "OLLAMA_BASE_URL_2", "COLAB_OLLAMA_URL_2"):
                            nodes[2] = clean_url(v)
                        elif k in ("COLAB_URL_3", "OLLAMA_BASE_URL_3", "COLAB_OLLAMA_URL_3"):
                            nodes[3] = clean_url(v)
            except Exception:
                pass

    # Check process.env overrides
    if os.environ.get("OLLAMA_BASE_URL"):
        nodes[1] = clean_url(os.environ["OLLAMA_BASE_URL"])
    if os.environ.get("COLAB_URL_2") or os.environ.get("OLLAMA_BASE_URL_2"):
        nodes[2] = clean_url(os.environ.get("COLAB_URL_2") or os.environ.get("OLLAMA_BASE_URL_2"))
    if os.environ.get("COLAB_URL_3") or os.environ.get("OLLAMA_BASE_URL_3"):
        nodes[3] = clean_url(os.environ.get("COLAB_URL_3") or os.environ.get("OLLAMA_BASE_URL_3"))

    return nodes

def save_node_url(node_num: int, raw_url: str):
    """Save or update a Colab node URL in .env.local."""
    url = clean_url(raw_url)
    key_name = "OLLAMA_BASE_URL" if node_num == 1 else f"COLAB_URL_{node_num}"
    lines = []
    found = False
    target_file = ".env.local" if os.path.exists(".env.local") else ".env"

    if os.path.exists(target_file):
        with open(target_file, "r") as f:
            for line in f:
                if line.startswith(f"{key_name}=") or (node_num == 1 and line.startswith("COLAB_OLLAMA_URL=")):
                    lines.append(f"{key_name}={url}\n")
                    found = True
                else:
                    lines.append(line)

    if not found:
        lines.append(f"\n# Colab GPU Node {node_num}\n{key_name}={url}\n")

    with open(target_file, "w") as f:
        f.writelines(lines)

    print(f"{GREEN}✓ Successfully configured Node {node_num} in {target_file}:{RESET} {BOLD}{url}{RESET}")

def resolve_url(args_url: str = None, node_num: int = 1) -> str:
    if args_url:
        return clean_url(args_url)

    nodes = load_env_urls()
    url = nodes.get(node_num, "")
    if not url and node_num == 1 and nodes:
        # Fall back to any available node
        url = next(iter(nodes.values()))

    if not url:
        print(f"{RED}Error: Colab Ollama URL for Node {node_num} not found.{RESET}")
        print(f"Please specify --url https://<your-subdomain>.trycloudflare.com or add it via:")
        print(f"  {CYAN}python3 scripts/colab_pull.py --add-node {node_num} https://<subdomain>.trycloudflare.com{RESET}")
        sys.exit(1)

    return url

def list_installed_models(base_url: str, header_label: str = "") -> list[str]:
    tags_url = f"{base_url}/api/tags"
    req = urllib.request.Request(tags_url, headers={"User-Agent": "DualBlind-Manager/1.0"})
    try:
        with urllib.request.urlopen(req, timeout=12) as res:
            data = json.loads(res.read().decode("utf-8"))
            models = data.get("models", [])
            title = header_label or f"MODELS INSTALLED ON COLAB GPU ({len(models)})"
            print(f"\n{BOLD}{CYAN}=== {title} ==={RESET}")
            print(f"{DIM}Host: {base_url}{RESET}")
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

def list_cluster():
    """Inspect all configured Colab GPU instances simultaneously."""
    nodes = load_env_urls()
    print(f"\n{BOLD}{MAGENTA}======================================================{RESET}")
    print(f"{BOLD}{MAGENTA}   DualBlind Multi-Node Colab GPU Cluster Status     {RESET}")
    print(f"{BOLD}{MAGENTA}======================================================{RESET}")

    if not nodes:
        print(f"{YELLOW}No Colab nodes currently configured.{RESET}")
        print(f"Add your Colab tunnel URLs via:")
        print(f"  {CYAN}python3 scripts/colab_pull.py --add-node 1 https://node1.trycloudflare.com{RESET}")
        print(f"  {CYAN}python3 scripts/colab_pull.py --add-node 2 https://node2.trycloudflare.com{RESET}")
        print(f"  {CYAN}python3 scripts/colab_pull.py --add-node 3 https://node3.trycloudflare.com{RESET}\n")
        return

    for node_id in sorted(nodes.keys()):
        url = nodes[node_id]
        list_installed_models(url, header_label=f"NODE {node_id} (Colab GPU)")

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
    parser = argparse.ArgumentParser(description="DualBlind Colab Model & Cluster Manager")
    parser.add_argument("--url", help="Direct Colab Cloudflare tunnel URL (e.g. https://xxx.trycloudflare.com)")
    parser.add_argument("--node", type=int, default=1, choices=[1, 2, 3], help="Target Colab node number (1, 2, or 3, default: 1)")
    parser.add_argument("--add-node", nargs=2, metavar=("NODE_NUM", "URL"), help="Save a Colab tunnel URL for a node (e.g. --add-node 2 https://xxx.trycloudflare.com)")
    parser.add_argument("--list", action="store_true", help="List models installed on the target node")
    parser.add_argument("--cluster", "--list-all", dest="cluster", action="store_true", help="Inspect all configured Colab cluster nodes")
    parser.add_argument("--pull", help="Model tag to download (e.g. deepseek-r1:14b, qwen2.5-coder:14b, mistral-nemo:12b)")
    parser.add_argument(
        "--pack",
        choices=["flagship_14b", "reasoning", "coding", "all_small"],
        help="Download a curated pack: flagship_14b (DeepSeek R1 14B + Qwen 2.5 Coder 14B), reasoning, coding, or all_small",
    )
    args = parser.parse_args()

    if args.add_node:
        try:
            node_idx = int(args.add_node[0])
            url_val = args.add_node[1]
            save_node_url(node_idx, url_val)
            print(f"Now you can check or pull models into Node {node_idx}:")
            print(f"  python3 scripts/colab_pull.py --node {node_idx} --list")
            print(f"  python3 scripts/colab_pull.py --node {node_idx} --pull deepseek-r1:14b")
            return
        except Exception as e:
            print(f"{RED}Error saving node: {e}{RESET}")
            sys.exit(1)

    if args.cluster:
        list_cluster()
        return

    base_url = resolve_url(args.url, args.node)
    print(f"{CYAN}Connected to Colab Node {args.node}:{RESET} {BOLD}{base_url}{RESET}")

    if args.pull:
        pull_model(base_url, args.pull)
        list_installed_models(base_url)
    elif args.pack == "flagship_14b":
        for m in ["deepseek-r1:14b", "qwen2.5-coder:14b"]:
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
    elif args.pack == "all_small":
        for m in ["llama3.1:8b", "deepseek-r1:8b", "qwen2.5-coder:7b", "smollm2:1.7b"]:
            pull_model(base_url, m)
        list_installed_models(base_url)
    else:
        list_installed_models(base_url)
        print(f"{BOLD}Recommended Models to Pull into Colab T4 GPU:{RESET}")
        for name, meta in T4_RECOMMENDED_MODELS.items():
            print(f"  • {CYAN}{name:<20}{RESET} ({meta['size']}) - {meta['desc']}")
        print(f"\n{DIM}To pull any model remotely:{RESET}")
        print(f"  python3 scripts/colab_pull.py --node {args.node} --pull <model_name>")
        print(f"\n{DIM}To check entire multi-Colab cluster:{RESET}")
        print(f"  python3 scripts/colab_pull.py --cluster\n")

if __name__ == "__main__":
    main()
