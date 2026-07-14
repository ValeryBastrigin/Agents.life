"""Quick syntax/import check for billing modules."""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "backend"))
from src.billing.router import router
from src.billing.calculator import calculate_cost
from src.billing.plans import UserPlan
print("All billing modules OK")

# Check planes
print("Plan values:", [p.value for p in UserPlan])
print("Plan daily limits:", {p.value: p.daily_limit for p in UserPlan})

# Check calculator
cost = calculate_cost("gemini_3_1_flash", input_tokens=100, output_tokens=200)
print(f"calculate_cost(100 in, 200 out) = {cost}")