import asyncio
from src.billing.calculator import calculate_cost
from src.billing.plans import UserPlan, PlanManager

async def test_billing_calc():
    print("Testing billing calculator for accountant statement analysis...")
    # Simulate tokens for a typical statement processing
    tokens_in = 1500
    tokens_out = 800
    
    cost = calculate_cost("google/gemini-2.5-flash-lite", input_tokens=tokens_in, output_tokens=tokens_out)
    print(f"Calculated cost for statement (in={tokens_in}, out={tokens_out}): {cost} credits")
    
    # Check free plan daily limit
    free_limit = UserPlan.FREE.daily_limit
    print(f"FREE plan daily limit: {free_limit} credits")
    
    # Test can use credits
    can_use = PlanManager.can_use_credits(UserPlan.FREE, credits_used_today=0, requested_credits=cost)
    print(f"Can use {cost} credits on FREE plan starting from 0 used: {can_use}")
    
    assert cost > 0, "Cost should be greater than 0"
    assert cost < 50, "Cost should be reasonable and not burn the whole daily limit"
    print("Billing test passed successfully!")

if __name__ == "__main__":
    asyncio.run(test_billing_calc())
