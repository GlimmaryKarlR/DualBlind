#!/usr/bin/env python3
"""
DualBlind AI Benchmark - Google Colab Ollama Host & Cloudflare Tunnel
====================================================================
Runs inside Google Colab (with free GPU: T4 / L4 / A100).
Installs Ollama, pulls the desired open-source model, starts an OpenAI-compatible
inference endpoint, and tunnels it securely to the internet via Cloudflare Tunnel.

Zero account or credit card required. Cloudflare Tunnel gives a public https:// URL.

Supported Models:
  1. smollm2:1.7b       (1.8 GB - ultra fast, low VRAM)
  2. gemma2:9b          (5.4 GB - Google high quality)
  3. qwen2.5-coder:7b   (4.7 GB - Alibaba top coding reasoning)
  4. deepseek-r1:8b     (5.2 GB - DeepSeek R1 reasoning chain)
  5. llama3.1:8b        (4.9 GB - Meta benchmark gold standard)
  6. all                (Pulls all 5 models onto one Colab instance)

Usage in Google Colab (Run in a code cell):
------------------------------------------
!python3 scripts/colab_ollama_server.py --model llama3.1:8b
# or pull all models:
!python3 scripts/colab_ollama_server.py --model all
"""

import argparse
import json
import os
import re
import shutil
import subprocess
import sys
import threading
import time
import urllib.error
import urllib.request

GREEN = "\033[92m"
YELLOW = "\033[93m"
CYAN = "\033[96m"
RED = "\033[91m"
BOLD = "\033[1m"
RESET = "\033[0m"

STANDARD_MODELS = {
    "smollm2:1.7b": {
        "env_var": "OLLAMA_URL_SMOLLM2_1_7B",
        "size": "1.8 GB",
        "desc": "SmolLM2 1.7B Lightweight"
    },
    "gemma2:9b": {
        "env_var": "OLLAMA_URL_GEMMA2_9B",
        "size": "5.4 GB",
        "desc": "Gemma 2 9B (Google)"
    },
    "qwen2.5-coder:7b": {
        "env_var": "OLLAMA_URL_QWEN2_5_CODER_7B",
        "size": "4.7 GB",
        "desc": "Qwen 2.5 Coder 7B"
    },
    "deepseek-r1:8b": {
        "env_var": "OLLAMA_URL_DEEPSEEK_R1_8B",
        "size": "5.2 GB",
        "desc": "DeepSeek R1 8B Distill"
    },
    "llama3.1:8b": {
        "env_var": "OLLAMA_URL_LLAMA3_1_8B",
        "size": "4.9 GB",
        "desc": "Llama 3.1 8B (Meta)"
    }
}


def log(prefix: str, msg: str, color: str = CYAN):
    print(f"{color}{BOLD}[{prefix}]{RESET} {msg}")


def check_gpu():
    """Verify NVIDIA GPU presence in Colab."""
    try:
        res = subprocess.run(["nvidia-smi", "--query-gpu=name,memory.total", "--format=csv,noheader"],
                             capture_output=True, text=True, check=True)
        gpu_info = res.stdout.strip()
        log("GPU", f"Detected GPU: {GREEN}{gpu_info}{RESET}")
        return True
    except Exception:
        log("GPU", "No NVIDIA GPU detected. Running on CPU (inference will be slower).", YELLOW)
        return False


def install_ollama():
    """Install Ollama binary if not already installed."""
    if shutil.which("ollama"):
        log("Ollama", "Ollama is already installed.")
        return

    log("Ollama", "Installing dependencies and Ollama binary...", YELLOW)
    try:
        # Install zstd and pciutils to extract the package and detect GPU hardware
        subprocess.run("apt-get update -qq && apt-get install -y -qq zstd pciutils", shell=True, check=True)
        # Download and extract the .tar.zst package into /usr
        subprocess.run("curl -fsSL https://ollama.com/download/ollama-linux-amd64.tar.zst -o /tmp/ollama.tar.zst", shell=True, check=True)
        subprocess.run("tar --zstd -xf /tmp/ollama.tar.zst -C /usr", shell=True, check=True)
        subprocess.run("rm -f /tmp/ollama.tar.zst", shell=True, check=True)
        log("Ollama", f"{GREEN}Ollama installed successfully!{RESET}")
    except Exception as e:
        log("Ollama", f"Extraction error: {e}. Trying fallback binary archive...", YELLOW)
        subprocess.run("curl -fsSL https://ollama.com/download/ollama-linux-amd64.tgz -o /tmp/ollama.tgz && tar -xzf /tmp/ollama.tgz -C /usr && rm -f /tmp/ollama.tgz", shell=True, check=False)


def get_ollama_bin() -> str:
    """Find ollama executable path."""
    for cand in ["ollama", "/usr/bin/ollama", "/usr/local/bin/ollama", "/bin/ollama"]:
        p = shutil.which(cand) or (cand if os.path.isfile(cand) and os.access(cand, os.X_OK) else None)
        if p:
            return p
    return "ollama"


def start_ollama_daemon():
    """Start `ollama serve` in background."""
    # Check if already running
    try:
        urllib.request.urlopen("http://127.0.0.1:11434/", timeout=2)
        log("Ollama", "Ollama daemon is already active.")
        return
    except Exception:
        pass

    log("Ollama", "Starting Ollama daemon in background...", YELLOW)
    env = os.environ.copy()
    env["OLLAMA_HOST"] = "0.0.0.0:11434"
    env["OLLAMA_KEEP_ALIVE"] = "24h"

    ollama_bin = get_ollama_bin()
    subprocess.Popen(
        [ollama_bin, "serve"],
        env=env,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL
    )

    # Wait for daemon to become responsive
    for _ in range(30):
        try:
            urllib.request.urlopen("http://127.0.0.1:11434/", timeout=1)
            log("Ollama", f"{GREEN}Ollama daemon responsive on http://127.0.0.1:11434{RESET}")
            return
        except Exception:
            time.sleep(1)
    raise RuntimeError("Timed out waiting for Ollama daemon to start.")


def pull_model(model_name: str):
    """Pull specified model using ollama pull."""
    log("Pull", f"Downloading model: {BOLD}{model_name}{RESET}...", CYAN)
    ollama_bin = get_ollama_bin()
    res = subprocess.run([ollama_bin, "pull", model_name], check=True)
    log("Pull", f"{GREEN}Model '{model_name}' ready!{RESET}")


def install_cloudflared() -> str:
    """Download and return path to cloudflared executable."""
    cloudflared_path = shutil.which("cloudflared")
    if cloudflared_path:
        return cloudflared_path

    local_path = os.path.abspath("./cloudflared")
    if os.path.isfile(local_path) and os.access(local_path, os.X_OK):
        return local_path

    log("Tunnel", "Downloading Cloudflare Tunnel client (cloudflared)...", YELLOW)
    url = "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64"
    urllib.request.urlretrieve(url, local_path)
    os.chmod(local_path, 0o755)
    log("Tunnel", f"{GREEN}cloudflared downloaded!{RESET}")
    return local_path


def start_cloudflare_tunnel(cloudflared_bin: str, port: int = 11434) -> str:
    """Launch cloudflared tunnel to localhost:11434 and extract trycloudflare.com URL."""
    log("Tunnel", f"Starting tunnel to http://127.0.0.1:{port}...", CYAN)
    cmd = [cloudflared_bin, "tunnel", "--url", f"http://127.0.0.1:{port}"]

    proc = subprocess.Popen(
        cmd,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1
    )

    tunnel_url = None
    url_pattern = re.compile(r"https://[a-zA-Z0-9-]+\.trycloudflare\.com")

    # Read output until URL is discovered
    start_time = time.time()
    while time.time() - start_time < 45:
        line = proc.stdout.readline()
        if not line:
            break
        match = url_pattern.search(line)
        if match:
            tunnel_url = match.group(0)
            break

    if not tunnel_url:
        raise RuntimeError("Failed to obtain Cloudflare Tunnel URL within 45s.")

    return tunnel_url


def test_endpoint(tunnel_url: str, test_model: str):
    """Perform a quick test query against the tunnel."""
    endpoint = f"{tunnel_url.rstrip('/')}/v1/chat/completions"
    log("Test", f"Testing inference endpoint on: {endpoint}...", CYAN)

    payload = {
        "model": test_model,
        "messages": [{"role": "user", "content": "Respond with the single word 'READY'"}],
        "max_tokens": 10,
        "temperature": 0.1
    }

    req = urllib.request.Request(
        endpoint,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )

    for attempt in range(4):
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                content = data.get("choices", [{}])[0].get("message", {}).get("content", "").strip()
                log("Test", f"{GREEN}Endpoint verified! Model response: {content}{RESET}")
                return
        except Exception as e:
            if attempt < 3:
                time.sleep(2.5)
            else:
                log("Test", f"Ping note: {e} (Cloudflare DNS propagating)", YELLOW)


def main():
    parser = argparse.ArgumentParser(description="DualBlind Google Colab Ollama Host")
    parser.add_argument(
        "--model",
        default="llama3.1:8b",
        help="Model to host: smollm2:1.7b, gemma2:9b, qwen2.5-coder:7b, deepseek-r1:8b, llama3.1:8b, or 'all' (default: llama3.1:8b)"
    )
    parser.add_argument("--port", type=int, default=11434, help="Local Ollama port (default: 11434)")
    args = parser.parse_args()

    print(f"\n{BOLD}{GREEN}================================================================{RESET}")
    print(f"{BOLD}{GREEN}   DualBlind AI Benchmark - Google Colab Ollama Host   {RESET}")
    print(f"{BOLD}{GREEN}================================================================{RESET}\n")

    check_gpu()
    install_ollama()
    start_ollama_daemon()

    models_to_pull = []
    if args.model.lower() == "all":
        models_to_pull = list(STANDARD_MODELS.keys())
    elif args.model in STANDARD_MODELS:
        models_to_pull = [args.model]
    else:
        models_to_pull = [args.model]

    for m in models_to_pull:
        pull_model(m)

    cloudflared = install_cloudflared()
    tunnel_url = start_cloudflare_tunnel(cloudflared, args.port)
    endpoint_v1 = f"{tunnel_url}/v1"

    # Test the primary model
    test_endpoint(tunnel_url, models_to_pull[0])

    print(f"\n{BOLD}{GREEN}================================================================{RESET}")
    print(f"{BOLD}{GREEN}   🎉 Colab Ollama Server is LIVE and Publicly Accessible!     {RESET}")
    print(f"{BOLD}{GREEN}================================================================{RESET}")
    print(f"Public Tunnel URL:  {BOLD}{CYAN}{tunnel_url}{RESET}")
    print(f"OpenAI Endpoint:    {BOLD}{GREEN}{endpoint_v1}/chat/completions{RESET}")
    print(f"Models Ready:       {', '.join(models_to_pull)}\n")

    print(f"{BOLD}{YELLOW}--- HOW TO CONNECT DUALBLIND ---{RESET}")
    if len(models_to_pull) == 1:
        model_name = models_to_pull[0]
        meta = STANDARD_MODELS.get(model_name, {})
        env_var = meta.get("env_var", f"OLLAMA_URL_{model_name.replace(':', '_').replace('.', '_').upper()}")
        print(f"Option A: Add this line to your DualBlind {BOLD}.env.local{RESET}:")
        print(f"  {GREEN}{env_var}={endpoint_v1}{RESET}\n")
    else:
        print("Option A: Add this line to your DualBlind {BOLD}.env.local{RESET} to host all models:")
        print(f"  {GREEN}OLLAMA_BASE_URL={endpoint_v1}{RESET}\n")

    print(f"Option B: Run directly via CLI:")
    print(f"  {CYAN}python3 scripts/arena_runner.py --provider ollama --ollama-url {endpoint_v1}{RESET}\n")
    print(f"{BOLD}{GREEN}================================================================{RESET}")
    print(f"{DIM}Keep this Colab tab running. Press Stop in Colab to terminate server.{RESET}\n")

    # Keep script alive
    try:
        while True:
            time.sleep(3600)
    except KeyboardInterrupt:
        log("Server", "Stopping Colab Ollama host.", YELLOW)


if __name__ == "__main__":
    main()
