import httpx
import json

url = 'http://localhost:8001/api/chat/stream'
payload = {'user_id': 1, 'message': 'Напиши короткое приветствие', 'chat_id': None}
count = 0
with httpx.stream('POST', url, json=payload, timeout=30) as r:
    for line in r.iter_lines():
        if not line:
            continue
        if line.startswith('data: '):
            data = line[6:]
            if data == '[DONE]':
                print('\nDONE')
                break
            try:
                obj = json.loads(data)
                if 'token' in obj:
                    print(obj['token'], end='', flush=True)
                    count += len(obj['token'])
                elif 'done' in obj:
                    print('\nDONE event:', json.dumps(obj, ensure_ascii=False)[:300])
                elif 'widget' in obj:
                    print('\nWIDGET:', json.dumps(obj['widget'], ensure_ascii=False)[:200])
            except:
                pass
        if count > 1000:
            break
print('\nTotal chars received:', count)