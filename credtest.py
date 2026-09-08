import json
import os
import urllib.error
import urllib.request
from pathlib import Path


def load_env_file(path: Path) -> None:
    if not path.exists():
        return

    with path.open("r", encoding="utf-8") as env_file:
        for raw_line in env_file:
            line = raw_line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue

            key, value = line.split("=", 1)
            key = key.strip()
            value = value.strip().strip("'\"")
            os.environ.setdefault(key, value)


def get_api_keys() -> list[str]:
    project_root = Path(__file__).resolve().parent
    load_env_file(project_root / ".env.local")
    load_env_file(project_root / ".env")

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

    add_candidates(os.environ.get("OPENROUTER_API_KEY"))
    add_candidates(os.environ.get("OPENROUTER_API_KEYS"))
    for env_name in sorted(os.environ):
        if env_name.startswith("OPENROUTER_API_KEY_"):
            add_candidates(os.environ.get(env_name))

    if not keys:
        add_candidates(os.environ.get("GEMINI_API_KEY"))
        add_candidates(os.environ.get("GOOGLE_API_KEY"))
        for env_name in sorted(os.environ):
            if env_name.startswith("GEMINI_API_KEY_"):
                add_candidates(os.environ.get(env_name))

    if not keys:
        raise RuntimeError("No API key found in environment or .env.local")

    return keys


API_KEYS = get_api_keys()

for index, API_KEY in enumerate(API_KEYS, start=1):
    print(f"\nChecking key {index}/{len(API_KEYS)}")
    url = "https://openrouter.ai/api/v1/auth/key"
    headers = {"Authorization": f"Bearer {API_KEY}"}

    req = urllib.request.Request(url, headers=headers)

    try:
        with urllib.request.urlopen(req) as response:
            result = json.loads(response.read().decode())
            data = result.get("data", {})

            label = data.get("label", "N/A")
            usage = data.get("usage", 0.0)
            limit = data.get("limit")
            is_free = data.get("is_free_tier", False)

            print(f"Key Label   : {label}")
            print(f"Total Used  : ${usage:.4f}")

            if limit is not None:
                remaining = max(0.0, limit - usage)
                print(f"Key Limit   : ${limit:.4f}")
                print(f"Remaining   : ${remaining:.4f}")
            else:
                print("Key Limit   : No hard limit set on this key")

            print(f"Free Tier   : {is_free}")

    except urllib.error.HTTPError as e:
        if e.code == 401:
            print("Error: Invalid or expired API key.")
        else:
            print(f"HTTP Error {e.code}: {e.reason}")
    except Exception as e:
        print(f"Error fetching key details: {e}")