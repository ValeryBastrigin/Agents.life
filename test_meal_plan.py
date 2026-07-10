import asyncio
import json
import httpx

async def test():
    async with httpx.AsyncClient() as client:
        r = await client.post('http://localhost:8000/api/chat', json={
            'user_id': 1,
            'message': 'Составь персональный план питания на 1 день (завтрак, обед, ужин, перекус). Учти следующие пожелания пользователя: хочу здоровое питание, без фастфуда, люблю рыбу и овощи. Блюда должны быть разнообразными, вкусными и сбалансированными по КБЖУ.',
            'agent': 'dietitian'
        })
        print('Status:', r.status_code)
        data = r.json()
        print('Response keys:', list(data.keys()))
        response_text = data.get('response', '')
        print('Response first 800 chars:')
        print(response_text[:800])
        # Try to parse as JSON
        try:
            parsed = json.loads(response_text)
            print('\nPARSED JSON keys:', list(parsed.keys()))
            if 'meals' in parsed:
                print('Number of meals:', len(parsed['meals']))
                for m in parsed['meals']:
                    type_name = m.get('type', '?')
                    dishes_count = len(m.get('dishes', []))
                    print(f'  {type_name}: {dishes_count} dishes')
                    for d in m.get('dishes', []):
                        print(f'    - {d.get("name", "?")}: {d.get("calories", "?")} kcal')
            if 'type' in parsed:
                print('widget type:', parsed['type'])
        except json.JSONDecodeError:
            print('\nResponse is NOT valid JSON - trying to extract...')
            import re
            json_match = re.search(r'\{[\s\S]*\}', response_text)
            if json_match:
                cleaned = json_match.group().replace('```json', '').replace('```', '').strip()
                try:
                    parsed = json.loads(cleaned)
                    print('Found JSON inside! Keys:', list(parsed.keys()))
                except Exception as e2:
                    print(f'Still could not extract: {e2}')
            else:
                print('No JSON found in response at all')

if __name__ == '__main__':
    asyncio.run(test())