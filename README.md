<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/6b64ee16-ae5b-4d86-99d7-236b77bc5829

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

---

## 🤖 Headless Autonomous Arena Runner (Python)

DualBlind includes a resilient, zero-click Python runner (`scripts/arena_runner.py`) with a built-in self-healing watchdog. It executes multi-agent benchmark trials in a continuous loop and automatically restarts upon network glitches, API timeouts, or rate limits.

### Quick Start (Zero Extra Dependencies)
Uses Python's standard library (`urllib` / `json`), requiring no external `pip` packages:

```bash
# Run against your local dev server (default: http://localhost:3000)
python3 scripts/arena_runner.py

# Run against your live cloud deployment
python3 scripts/arena_runner.py --url https://dual-blind.vercel.app

# Target a specific suite (e.g., GPQA Diamond, SWE-bench, MATH/AIME, Humanity's Last Exam)
python3 scripts/arena_runner.py --suite gpqa_diamond

# Custom matchup (Gemini 3.7 Flash vs Gemini 2.5 Flash)
python3 scripts/arena_runner.py --model-a gemini-3.7-flash --model-b gemini-2.5-flash

# Run 50 trials with verbose transcript streaming
python3 scripts/arena_runner.py --count 50 --verbose

# Run continuously as a background daemon
nohup python3 scripts/arena_runner.py > arena_runner.log 2>&1 &
```

### Self-Healing & Auto-Restart Watchdog
- **Per-Trial Error Isolation**: If a single turn encounters a transient 503/429 error, the runner logs the notice, waits with backoff, and safely continues to the next challenge without halting.
- **Global Watchdog Loop**: If an unhandled network disconnection or fatal exception occurs, the outer supervisor catches it, logs the traceback, initiates an 8-second countdown, and automatically restarts the runner loop.
- **Persistent Live Sync**: Every completed evaluation is automatically verified against ground truth, submitted to the live Firestore & in-memory Leaderboard, and appended to a local `arena_runs_local.jsonl` backup file.

