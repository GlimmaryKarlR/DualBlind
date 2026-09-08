import json
import urllib.request

# Replace with your OpenRouter API key
API_KEY = "s"

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