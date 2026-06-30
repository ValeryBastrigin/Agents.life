import requests
import json

# Test stream endpoint
r = requests.post('http://localhost:8001/api/chat/stream',
    json={"user_id":1,"message":"Привет"},
    stream=True,
    timeout=60)

print(f"Status: {r.status_code}")
print(f"Headers: {dict(r.headers)}")
print("--- STREAMING RESPONSE ---")

count = 0
for line in r.iter_lines():
    if line:
        line = line.decode()
        if line.startswith("data: "):
            data = line[6:]
            if data != "[DONE]":
                count += 1
                print(data, end="", flush=True)
        else:
            print(f"RAW: {line}")

print(f"\n--- DONE ({count} chunks) ---")
