import sys
sys.path.insert(0, 'backend')
from src.billing.calculator import calculate_cost

cost_flash = calculate_cost('google/gemini-2.5-flash-lite', input_tokens=2454, output_tokens=339)
cost_lite = calculate_cost('google/gemini-2.5-flash-lite_lite', input_tokens=2454, output_tokens=339)
print(f"Gemini 2.5 Flash: {cost_flash} credits")
print(f"Gemini 2.5 Flash Lite: {cost_lite} credits")
