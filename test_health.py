import urllib.request
req = urllib.request.Request('http://localhost:8001/health')
try:
    with urllib.request.urlopen(req) as response:
        print(response.read().decode())
except Exception as e:
    print("Error:", e)
