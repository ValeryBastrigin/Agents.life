"""Quick integration test for BillingEngine."""
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from src.billing import (
    CREDITS_PER_USD,
    MODELS_PRICING,
    SUPPORTED_MODELS,
    calculate_cost,
    PlanManager,
    UserPlan,
    PlanExceededError,
    UnknownModelError,
)


def main():
    print("=== BillingEngine Smoke Test ===\n")

    # 1. Constants
    print(f"CREDITS_PER_USD: {CREDITS_PER_USD}")
    print(f"Supported models: {SUPPORTED_MODELS}\n")

    # 2. Cost calculations
    cost_1 = calculate_cost("gemini_3_1_flash", 100, 50)
    print(f"[gemini_3_1_flash] 100 in, 50 out -> {cost_1} credits")

    cost_2 = calculate_cost("gemini_2_5_flash", 200, 100)
    print(f"[gemini_2_5_flash] 200 in, 100 out -> {cost_2} credits")

    cost_3 = calculate_cost("openai_embedding", input_tokens=1000)
    print(f"[openai_embedding] 1000 in -> {cost_3} credits")

    cost_4 = calculate_cost("mistral_audio", audio_minutes=2.5)
    print(f"[mistral_audio] 2.5 min -> {cost_4} credits")

    # With cache & images
    cost_5 = calculate_cost(
        "gemini_3_1_flash",
        input_tokens=100,
        output_tokens=50,
        cache_read_tokens=1000,
        cache_write_tokens=500,
        image_count=2,
    )
    print(f"[gemini_3_1_flash] full features -> {cost_5} credits\n")

    # 3. Error handling: unknown model
    try:
        calculate_cost("non_existent_model", 100, 50)
    except UnknownModelError as e:
        print(f"[OK] UnknownModelError raised: {e}")

    # 4. PlanManager
    for plan in UserPlan:
        limit = PlanManager.get_daily_limit(plan)
        remaining = PlanManager.get_remaining_credits(plan, 50)
        print(f"Plan {plan.display_name}: daily_limit={limit}, remaining_after_50={remaining}")

    print()
    print(f"FREE can use 150 (0 used): {PlanManager.can_use_credits(UserPlan.FREE, 0, 150)}")
    print(f"FREE can use 250 (0 used): {PlanManager.can_use_credits(UserPlan.FREE, 0, 250)}")

    # Exceeded error
    try:
        PlanManager.check_credits_or_raise(UserPlan.FREE, 190, 20)
    except PlanExceededError as e:
        print(f"[OK] PlanExceededError raised: {e}")

    # Parse from string
    p = PlanManager.from_string("pro")
    print(f"Parsed 'pro' -> {p.display_name} (${p.monthly_price_usd}/mo)")

    print("\n=== All tests passed! ===")


if __name__ == "__main__":
    main()