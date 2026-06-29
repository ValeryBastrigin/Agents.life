import httpx
import asyncio
import json

async def main():
    async with httpx.AsyncClient(timeout=90) as c:
        # Test 1: food routing
        print("=== Test 1: Food routing ===")
        r = await c.post(
            'http://localhost:8001/api/chat',
            json={'user_id': 1, 'message': 'Я скушал 200 грамм вареной куриной грудки и 100 грамм риса'}
        )
        print(f"Status: {r.status_code}")
        data = r.json()
        print(f"Response: {data.get('response', '')[:500]}")
        print(f"Chat ID: {data.get('chat_id')}")
        
        # Test 2: check food-today
        print("\n=== Test 2: Check food-today ===")
        r = await c.get('http://localhost:8001/api/user/1/food-today')
        print(f"Status: {r.status_code}")
        data = r.json()
        print(f"Items: {len(data.get('items', []))}")
        for item in data.get('items', []):
            print(f"  - {item['product_name']}: {item['grams']}g, {item['calories']}kcal, P:{item['protein']} F:{item['fats']} C:{item['carbs']}")

asyncio.run(main())