import requests
import json

r = requests.post(
    'http://localhost:8001/api/events/',
    json={
        'title': 'Test event',
        'start_time': '2026-08-09T10:00:00',
        'end_time': '2026-08-09T11:00:00'
    },
    headers={'X-Test-User-Id': '1'}
)
print(f"Status: {r.status_code}")
print(json.dumps(r.json(), indent=2, ensure_ascii=False))