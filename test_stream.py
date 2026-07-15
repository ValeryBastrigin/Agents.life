import requests

try:
    r = requests.post('http://localhost:8001/api/chat/stream', 
        json={'user_id': 1, 'message': 'Привет', 'history': []},
        stream=True, timeout=30)
    print(f'Status: {r.status_code}')
    print(f'Headers: {dict(r.headers)}')
    print('---')
    for line in r.iter_lines(decode_unicode=True):
        if line:
            print(f'LINE: {line}')
    print('---')
    print('Stream completed successfully')
except Exception as e:
    print(f'ERROR: {e}')