cat << 'EOF' > loop_runner.sh
#!/bin/bash

# Infinite loop wrapper for DualBlind Arena Runner
while true; do
  echo "========================================================"
  echo "Starting DualBlind Arena Run at $(date)"
  echo "========================================================"

  python3 scripts/arena_runner.py \
    --url https://dual-blind.vercel.app \
    --provider-a huggingface \
    --provider-b openrouter \
    --force-free \
    --verbose

  EXIT_CODE=$?
  echo "========================================================"
  echo "Process exited with code $EXIT_CODE. Restarting in 5 seconds..."
  echo "Press Ctrl+C to abort."
  echo "========================================================"
  sleep 5
done
EOF