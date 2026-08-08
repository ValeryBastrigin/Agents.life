import urllib.request
import json
import sys

payload = {
    "user_id": 1,
    "agent": "dietitian",
    "message": "Составь персональный план питания на 1 день (завтрак, обед, ужин, перекус). Учти пожелания: хочу здоровое питание, без фастфуда, люблю рыбу и овощи. Блюда должны быть разнообразными, вкусными и сбалансированными по КБЖУ."
}

data = json.dumps(payload).encode('utf-8')
req = urllib.request.Request(
    'http://localhost:8000/api/chat',
    data=data,
    headers={'Content-Type': 'application/json'},
    method='POST'
)

try:
    with urllib.request.urlopen(req, timeout=120) as resp:
        raw = resp.read().decode('utf-8')
        print(f"Status: {resp.status}")
        result = json.loads(raw)
        print(f"Response keys: {list(result.keys())}")
        response_text = result.get('response', '')
        print(f"Response length: {len(response_text)}")
        print("First 1000 chars:")
        print(response_text[:1000])

        # Try parse as JSON
        try:
            parsed = json.loads(response_text)
            print(f"\nPARSED JSON keys: {list(parsed.keys())}")
            if 'type' in parsed:
                print(f"Widget type: {parsed['type']}")
            if 'meals' in parsed:
                print(f"Number of meals: {len(parsed['meals'])}")
                for m in parsed['meals']:
                    type_name = m.get('type', '?')
                    dishes = m.get('dishes', [])
                    print(f"  {type_name}: {len(dishes)} dishes")
                    for d in dishes:
                        print(f"    - {d.get('name', '?')}: {d.get('calories', '?')}")
        except json.JSONDecodeError:
            print("\nResponse is NOT valid JSON!")
            # Try find JSON inside
            import re
            match = re.search(r'\{[\s\S]*\}', response_text)
            if match:
                cleaned = match.group().replace('```json','').replace('```','').strip()
                try:
                    parsed = json.loads(cleaned)
                    print(f"Found JSON inside! Keys: {list(parsed.keys())}")
                except Exception as e:
                    print(f"Cannot extract: {e}")
            else:
                print("No JSON found in response at all")

except Exception as e:
    print(f"ERROR: {e}")
    sys.exit(1)