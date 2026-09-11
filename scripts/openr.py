import json
import urllib.request

url = "https://openrouter.ai/api/v1/models"
req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})

try:
    with urllib.request.urlopen(req) as response:
        data = json.loads(response.read().decode("utf-8"))

    free_models = []
    paid_models = []

    for model in data.get("data", []):
        pricing = model.get("pricing", {})
        
        # Safely parse cost fields (OpenRouter returns strings like "0" or "0.000001")
        prompt_cost = float(pricing.get("prompt", 0) or 0)
        completion_cost = float(pricing.get("completion", 0) or 0)
        request_cost = float(pricing.get("request", 0) or 0)

        # Free if token costs evaluate to 0 or model ID ends with :free
        is_free = (
            prompt_cost == 0 and completion_cost == 0 and request_cost == 0
        ) or model["id"].endswith(":free")

        if is_free:
            free_models.append(model["id"])
        else:
            paid_models.append(model["id"])

    print(f"=== FREE MODELS ({len(free_models)}) ===")
    for model_id in sorted(free_models):
        print(f"  {model_id}")

    print(f"\n=== PAID MODELS ({len(paid_models)}) ===")
    # Print sample of paid models
    for model_id in sorted(paid_models)[:10]:
        print(f"  {model_id}")
    print(f"  ... and {len(paid_models) - 10} more paid models.")

except Exception as e:
    print(f"Error: {e}")