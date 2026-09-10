FROM vllm/vllm-openai:latest

# Expose port 7860 required by Hugging Face Spaces
EXPOSE 7860

# Set default model (can be overridden in HF Space Variables)
ENV MODEL_NAME="meta-llama/Llama-3.1-8B-Instruct"
ENV MAX_MODEL_LEN="4096"

# Launch vLLM OpenAI-compatible server on port 7860
CMD ["sh", "-c", "python3 -m vllm.entrypoints.openai.api_server --host 0.0.0.0 --port 7860 --model $MODEL_NAME --max-model-len $MAX_MODEL_LEN"]
