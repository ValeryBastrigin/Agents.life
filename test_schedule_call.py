import urllib.request
import json

try:
    req = urllib.request.Request(
        'http://localhost:8001/api/secretary/parse-schedule-text/4',
        data=json.dumps({'text': 'встать в 8'}).encode('utf-8'),
        headers={'Content-Type': 'application/json'}
    )
    with urllib.request.urlopen(req) as resp:
        print(f"Status: {resp.status}")
        print(resp.read().decode('utf-8'))
except urllib.error.HTTPError as e:
    print(f"HTTPError Status: {e.code}")
    print(e.read().decode('utf-8'))
except Exception as e:
    print(f"Error: {e}")
