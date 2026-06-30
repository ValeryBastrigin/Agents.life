import requests
import json

# Test stream endpoint with a secretary scheduling request
print("=== Testing stream widget with secretary ===")
r = requests.post(
    'http://localhost:8001/api/chat/stream',
    json={'user_id': 1, 'message': 'запланируй встречу с тестовым виджетом завтра в 15:00 на час'},
    stream=True
)
print(f"Status: {r.status_code}")
for line in r.iter_lines():
    if line:
        line_str = line.decode('utf-8')
        if line_str.startswith('data: '):
            data_str = line_str[6:]
            try:
                data = json.loads(data_str)
                if 'text' in data:
                    text = data['text']
                    print(f"TEXT: {text[:200]}")
                    # Check if it's valid JSON widget
                    if text.strip().startswith('{'):
                        try:
                            widget = json.loads(text)
                            print(f"  -> WIDGET type: {widget.get('type')}")
                        except:
                            pass
                elif 'done' in data:
                    print(f"DONE: chat_id={data.get('chat_id')}")
                elif 'error' in data:
                    print(f"ERROR: {data['error']}")
            except json.JSONDecodeError:
                print(f"RAW: {line_str}")

print("\n=== Testing stream widget with food log ===")
r = requests.post(
    'http://localhost:8001/api/chat/stream',
    json={'user_id': 1, 'message': 'я съел овсянку на завтрак 300 грамм'},
    stream=True
)
print(f"Status: {r.status_code}")
for line in r.iter_lines():
    if line:
        line_str = line.decode('utf-8')
        if line_str.startswith('data: '):
            data_str = line_str[6:]
            try:
                data = json.loads(data_str)
                if 'text' in data:
                    text = data['text']
                    print(f"TEXT: {text[:200]}")
                    if text.strip().startswith('{'):
                        try:
                            widget = json.loads(text)
                            print(f"  -> WIDGET type: {widget.get('type')}")
                        except:
                            pass
                elif 'done' in data:
                    print(f"DONE: chat_id={data.get('chat_id')}")
                elif 'error' in data:
                    print(f"ERROR: {data['error']}")
            except json.JSONDecodeError:
                print(f"RAW: {line_str}")