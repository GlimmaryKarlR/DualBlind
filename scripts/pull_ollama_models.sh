#!/usr/bin/env bash
# DualBlind AI Benchmark - Ollama Model Suite Installer
# ======================================================
# Pulls top open-source models for 100% free, zero-rate-limit local benchmarking.

set -e

echo "============================================================"
echo "🚀 DualBlind AI Benchmark - Local Ollama Suite Setup"
echo "============================================================"

# Check if Ollama is running
if ! command -v ollama &> /dev/null; then
    echo "❌ Error: Ollama is not installed on your system."
    echo "   Please download & install Ollama from: https://ollama.com"
    exit 1
fi

# Auto-detect external drive location
if [ -d "/Volumes/My Passport/MODELS" ]; then
    export OLLAMA_MODELS="/Volumes/My Passport/MODELS"
    echo "📂 Storing models on external drive: $OLLAMA_MODELS"
fi

echo "✓ Ollama detected! Starting model downloads..."
echo ""

# 1. Standard Benchmark Suite (~23 GB Total)
MODELS=(
    "llama3.1:8b"         # Meta Llama 3.1 8B (4.7 GB)
    "deepseek-r1:8b"      # DeepSeek R1 8B Reasoning (4.9 GB)
    "qwen2.5-coder:7b"    # Qwen 2.5 Coding 7B (4.7 GB)
    "gemma2:9b"           # Google Gemma 2 9B (5.5 GB)
    "smollm2:1.7b"        # SmolLM2 1.7B Lightweight (1.2 GB)
    "phi3.5:mini"         # Microsoft Phi 3.5 Mini 3.8B (2.2 GB)
)

for model in "${MODELS[@]}"; do
    echo "⬇️  Pulling $model..."
    ollama pull "$model"
    echo "✓ $model installed!"
    echo "------------------------------------------------------------"
done

echo ""
echo "🎉 All standard Ollama benchmark models are ready!"
echo "   Run DualBlind local benchmarks anytime with:"
echo ""
echo "   python3 scripts/arena_runner.py --provider ollama --verbose"
echo "============================================================"
