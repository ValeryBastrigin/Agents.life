import requests
import sys

url = "http://localhost:8000/api/accountant/portfolio/analyze/1"
files = {"screenshots": ("test.png", b"fake-image-data", "image/png")}

try:
    r = requests.post(url, files=files, timeout=30)
    print(f"Status: {r.status_code}")
    print(f"Response: {r.text[:500]}")
except requests.exceptions.ConnectionError:
    print("Connection refused - server not running")
except Exception as e:
    print(f"Error: {e}")