import requests
import json

print("=== Test 1: Food routing ===")
r = requests.post(
    'http://localhost:8001/api/chat',
    json={'user_id': 1, 'message': 'Я скушал 200 грамм вареной куриной грудки и 100 грамм риса'},
    timeout=90
)
print(f"Status: {r.status_code}")
data = r.json()
print(f"Response: {data.get('response', '')[:500]}")
print(f"Chat ID: {data.get('chat_id')}")

print("\n=== Test 2: Check food-today ===")
r = requests.get('http://localhost:8001/api/user/1/food-today', timeout=30)
print(f"Status: {r.status_code}")
data = r.json()
print(f"Total Kcal: {data.get('total_calories')}")
print(f"Items: {len(data.get('items', []))}")
for item in data.get('items', []):
    print(f"  - {item['product_name']}: {item['grams']}g, {item['calories']}kcal, P:{item['protein']} F:{item['fats']} C:{item['carbs']}")