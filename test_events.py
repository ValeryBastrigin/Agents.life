import urllib.request
import json

try:
    req = urllib.request.Request('http://localhost:8001/api/events/1')
    with urllib.request.urlopen(req) as resp:
        print("Status:", resp.status)
        print("Body:", resp.read().decode())
except Exception as e:
    print("Error:", e)
