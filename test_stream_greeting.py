import requests
import json
import sys
import time

r = requests.post('http://localhost:8001/api/chat/stream', 
    json={'user_id': 1, 'message': 'Привет', 'history': []},
    stream=True, timeout=30)

token_count = 0
for line in r.iter_lines(decode_unicode=True):
    if line and line.startswith('data: '):
        data = json.loads(line[6:])
        t = data.get('type', '')
        if t == 'token':
            content = data['content']
            token_count += 1
            print(f'Token #{token_count} ({len(content)} chars): {repr(content[:80])}')
        elif t == 'done':
            print(f'Done - total tokens: {token_count}')
            print(f'Chat ID: {data.get("chat_id")}')
            print(f'Is new chat: {data.get("is_new_chat")}')
        elif t == 'chat_created':
            print(f'Chat created: {data}')
        else:
            print(f'Other event: type={t}, keys={list(data.keys())}')

print(f'\nTotal SSE events (tokens): {token_count}')