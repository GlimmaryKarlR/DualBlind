# Hugging Face Space vLLM Deployment Template

This directory contains everything you need to host any open-source model on Hugging Face Spaces with zero warmup delay and OpenAI API compatibility for DualBlind AI Benchmark.

## Quick 3-Step Setup Guide

### Step 1: Create Space on Hugging Face
1. Go to [Hugging Face Spaces](https://huggingface.co/new-space).
2. Name your space (e.g. `my-vllm-llama`).
3. Select **SDK: Docker** -> **Blank Docker**.
4. Hardware: Select a GPU hardware tier (e.g., **Nvidia T4** or **Nvidia A10G**).
5. Set Space status to **Always On** under Space Settings (prevents cold starts / warmup delays).

### Step 2: Upload Files
Upload the `Dockerfile` from this directory into your Hugging Face Space repository:
- `Dockerfile`

*(Optional)* Set environment variables in HF Space Settings:
- `MODEL_NAME` = `meta-llama/Llama-3.3-70B-Instruct` or `meta-llama/Llama-3.1-8B-Instruct`
- `HF_TOKEN` = Your Hugging Face User Access Token (required for gated models like Llama)

### Step 3: Link to DualBlind
Add your space URL to your `.env.local` file in DualBlind:
```env
HF_SPACE_URL=https://your-username-my-vllm-llama.hf.space
HF_TOKEN=hf_...
```

That's it! DualBlind will now automatically route all Hugging Face inference requests through your dedicated vLLM GPU space.
