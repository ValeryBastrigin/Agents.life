import requests
import json

BASE = "http://localhost:8001"

print("=== 1. GET /api/user/1/food-query-chat ===")
try:
    r = requests.get(f"{BASE}/api/user/1/food-query-chat")
    print(f"Status: {r.status_code}")
    print(f"Body: {r.text}")
except Exception as e:
    print(f"ERROR: {e}")

print()
print("=== 2. POST /api/chats (create) ===")
try:
    r = requests.post(f"{BASE}/api/chats", json={
        "title": "Test food chat",
        "user_id": 1,
        "agent_type": "dietitian"
    })
    print(f"Status: {r.status_code}")
    print(f"Body: {r.text}")
except Exception as e:
    print(f"ERROR: {e}")