import sys
import os
sys.path.append(os.path.abspath("backend"))

from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)

def test_endpoints():
    print("Testing GET /api/events/2...")
    response = client.get("/api/events/2")
    print("Status:", response.status_code)
    print("Body:", response.json())

    print("Testing GET /api/reminders/2...")
    response = client.get("/api/reminders/2")
    print("Status:", response.status_code)
    print("Body:", response.json())

    print("Testing POST /api/events/2...")
    payload = {
        "title": "Test Event 2",
        "start_time": "2026-08-08T10:00:00",
        "end_time": "2026-08-08T11:00:00",
        "color": "#3B82F6",
        "description": "Test description",
        "push_enabled": False
    }
    response = client.post("/api/events/2", json=payload)
    print("Status:", response.status_code)
    print("Body:", response.json())

if __name__ == "__main__":
    test_endpoints()
