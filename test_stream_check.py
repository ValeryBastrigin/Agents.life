import urllib.request
import json
import sys

# Test stream endpoint
payload = json.dumps({
    "user_id": 1,
    "message": "запланируй встречу с тестовым виджетом завтра в 15:00"
}).encode("utf-8")

req = urllib.request.Request(
    "http://localhost:8001/api/chat/stream",
    data=payload,
    headers={"Content-Type": "application/json"},
    method="POST"
)

try:
    with urllib.request.urlopen(req, timeout=120) as resp:
        with open("test_stream_result.txt", "w", encoding="utf-8") as f:
            f.write(f"Status: {resp.status}\n")
            f.write("=== STREAM EVENTS ===\n")
            buffer = b""
            while True:
                chunk = resp.read(1)
                if not chunk:
                    break
                buffer += chunk
                if buffer.endswith(b"\n\n"):
                    line = buffer.decode("utf-8")
                    f.write(line)
                    buffer = b""
            if buffer:
                f.write(buffer.decode("utf-8"))
    print("Test completed, results in test_stream_result.txt")
except Exception as e:
    with open("test_stream_result.txt", "w", encoding="utf-8") as f:
        f.write(f"ERROR: {e}")
    print(f"ERROR: {e}")