# -*- coding: utf-8 -*-
import urllib.request
import json

payload = json.dumps({
    "user_id": 1,
    "message": "Я скушал 200 грамм вареной куриной грудки и 100 грамм риса"
}).encode("utf-8")

req = urllib.request.Request(
    "http://localhost:8001/api/chat",
    data=payload,
    headers={"Content-Type": "application/json"},
    method="POST"
)

try:
    with urllib.request.urlopen(req, timeout=120) as resp:
        data = json.loads(resp.read().decode("utf-8"))
        print("Status:", resp.status)
        print("Response:", data.get("response", "")[:500])
        print("Chat ID:", data.get("chat_id"))
except Exception as e:
    print("ERROR:", e)