import urllib.request
import urllib.error
import json

data = json.dumps({
    "title": "Test Event",
    "start_time": "2026-08-08T10:00:00",
    "end_time": "2026-08-08T11:00:00",
    "color": "#3B82F6",
    "description": "Test description",
    "push_enabled": False
}).encode('utf-8')

req = urllib.request.Request(
    'http://localhost:8001/api/events/2',
    data=data,
    headers={'Content-Type': 'application/json'},
    method='POST'
)

try:
    with urllib.request.urlopen(req) as resp:
        print("Status:", resp.status)
        print("Body:", resp.read().decode())
except urllib.error.HTTPError as e:
    print("HTTP Error:", e.code)
    print("Error Body:", e.read().decode())
except Exception as e:
    print("Error:", e)
