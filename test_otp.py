import requests
import json

BASE = "http://localhost:8001"

# 1. Send code
print("=== SENDING CODE ===")
r = requests.post(f"{BASE}/auth/send-code", json={"email": "vbastrigin1@yandex.ru"})
print(f"Status: {r.status_code}")
print(f"Response: {r.text}")
print()

if r.status_code == 200:
    print("✅ Code sent successfully! Check your email.")
else:
    print("❌ Error sending code")