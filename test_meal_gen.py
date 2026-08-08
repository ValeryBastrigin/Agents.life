import asyncio
import urllib.request
import json
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy import text
from src.database import DATABASE_URL

async def test():
    # 1. Load profile
    engine = create_async_engine(DATABASE_URL.replace('+aiosqlite', '+aiosqlite'))
    async with AsyncSession(engine) as db:
        r = await db.execute(text('SELECT * FROM user_diet_profiles WHERE user_id = 1'))
        row = r.fetchone()
        if row:
            d = dict(row._mapping)
            print('=== ПРОФИЛЬ ПОЛЬЗОВАТЕЛЯ ===')
            print(f'Рост: {d["height"]} см, Вес: {d["weight"]} кг, Возраст: {d["age"]} лет')
            print(f'Пол: {d["gender"]}, Цель: {d["goal"]}, Активность: {d["activity_level"]}')
            print(f'КБЖУ: {d["calorie_target"]} ккал | Б:{d["protein_target"]} Ж:{d["fats_target"]} У:{d["carbs_target"]}')
    await engine.dispose()

    # 2. Send request to generate meal plan
    payload = json.dumps({
        'user_id': 1,
        'agent': 'dietitian',
        'message': 'Составь персональный план питания на 1 день (завтрак, обед, ужин, перекус). Блюда должны быть разнообразными, вкусными и сбалансированными по КБЖУ. ОТВЕТЬ СТРОГО В ФОРМАТЕ JSON (без markdown-разметки, без комментариев, только валидный JSON)'
    }).encode()

    req = urllib.request.Request('http://localhost:8000/api/chat',
        data=payload,
        headers={'Content-Type': 'application/json'},
        method='POST')

    print('\n=== ОТПРАВКА ЗАПРОСА ===')
    print(f'Payload: {payload.decode()[:200]}...')

    try:
        with urllib.request.urlopen(req, timeout=180) as resp:
            result = json.loads(resp.read().decode('utf-8'))
            response_text = result.get('response', '')
            print(f'\n=== ОТВЕТ ===')
            print(f'Длина: {len(response_text)} символов')
            print(f'Первые 500 символов:')
            print(response_text[:500])
            print(f'\nПоследние 500 символов:')
            print(response_text[-500:])
            # Try to parse as JSON
            import re
            json_match = re.search(r'\{[\s\S]*\}', response_text)
            if json_match:
                try:
                    parsed = json.loads(json_match.group())
                    if parsed.get('meals'):
                        print(f'\n=== РАЦИОН УСПЕШНО РАСПАРСЕН ===')
                        for meal in parsed['meals']:
                            print(f'{meal["type"]}: {len(meal.get("dishes", []))} блюд')
                            for dish in meal.get('dishes', []):
                                print(f'  - {dish.get("name", "?")} ({dish.get("calories", "?")} ккал)')
                except json.JSONDecodeError as e:
                    print(f'\n=== ОШИБКА ПАРСИНГА JSON: {e} ===')
                    clean = response_text.replace('```json', '').replace('```', '').strip()
                    print(f'Содержимое после очистки: {clean[:1000]}')
    except Exception as e:
        print(f'\n=== ОШИБКА: {e} ===')

asyncio.run(test())