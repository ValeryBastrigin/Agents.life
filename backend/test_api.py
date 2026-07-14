import requests

r = requests.get('http://localhost:8000/api/mentor/recommended-materials?user_id=1', timeout=10)
print('Status:', r.status_code)
data = r.json()
print('Materials count:', len(data.get('materials', [])))
for m in data.get('materials', []):
    has_goal = 'goal' in m
    has_url = 'url' in m
    print(f"  - {m.get('title', '?')}, has_goal: {has_goal}, has_url: {has_url}")
    if has_goal:
        print(f"    goal: {m['goal']}")