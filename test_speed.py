# -*- coding: utf-8 -*-
"""Speed test for chat model qwen/qwen3.6-flash"""
import requests
import time
import json

BASE = "http://localhost:8001"

# Test messages — разные типы запросов
TEST_MESSAGES = [
    ("Привет! Как дела?", "simple"),
    ("Что я могу сделать сегодня полезного?", "advice"),
    ("Помоги спланировать неделю: мне нужно заниматься спортом, работать и отдыхать", "planning"),
]

lines = []
def log(s):
    lines.append(s)
    print(s, flush=True)

log("=" * 60)
log("SPEED TEST: qwen/qwen3.6-flash")
log("=" * 60)

total_time = 0
count = 0

for msg, msg_type in TEST_MESSAGES:
    log(f"\n--- Test {count+1}: \"{msg[:80]}\" ---")
    payload = json.dumps({
        "user_id": 1,
        "message": msg
    }).encode("utf-8")
    
    start = time.time()
    try:
        req = requests.post(
            f"{BASE}/api/chat",
            data=payload,
            headers={"Content-Type": "application/json"},
            timeout=120
        )
        elapsed = time.time() - start
        data = req.json()
        response_text = data.get("response", "")
        
        log(f"  Status: {req.status_code}")
        log(f"  Time: {elapsed:.1f}s")
        log(f"  Response length: {len(response_text)} chars")
        log(f"  Response: {response_text[:300]}")
        
        total_time += elapsed
        count += 1
    except Exception as e:
        log(f"  ERROR: {e}")

if count > 0:
    avg = total_time / count
    log("\n" + "=" * 60)
    log(f"RESULTS: {count} tests, avg time = {avg:.1f}s")
    log("=" * 60)
    if avg < 10:
        log("VERDICT: FAST — model is suitable")
    else:
        log("VERDICT: SLOW — switch to gemini recommended")
else:
    log("No successful tests")

with open("test_speed_result.txt", "w", encoding="utf-8") as f:
    f.write("\n".join(lines))
