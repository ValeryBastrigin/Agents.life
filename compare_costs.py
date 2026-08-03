import sys
sys.path.insert(0, 'backend')
from src.billing.calculator import calculate_cost

cost_flash = calculate_cost('gemini_2_5_flash', input_tokens=2454, output_tokens=339)
cost_lite = calculate_cost('gemini_2_5_flash_lite', input_tokens=2454, output_tokens=339)
print(f"Gemini 2.5 Flash: {cost_flash} credits")
print(f"Gemini 2.5 Flash Lite: {cost_lite} credits")
