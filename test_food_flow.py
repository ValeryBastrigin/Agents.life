# -*- coding: utf-8 -*-
"""Test food consumption flow end-to-end.
Run inside Docker container: docker exec lifeagent-app python /app/test_food_flow.py
"""
import urllib.request
import json
import time
import os

# Inside container, app runs on port 8000; outside it's mapped to 8001
BASE_URL = os.environ.get("TEST_BASE_URL", "http://localhost:8000/api")
USER_ID = 1


def test_chat(message, description):
    """Send a chat message and print response."""
    print(f"\n{'='*60}")
    print(f"TEST: {description}")
    print(f"MESSAGE: {message}")
    print(f"{'='*60}")

    payload = json.dumps({
        "user_id": USER_ID,
        "message": message
    }).encode("utf-8")

    req = urllib.request.Request(
        f"{BASE_URL}/chat",
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST"
    )

    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            response_text = data.get("response", "")

            print(f"STATUS: {resp.status}")
            print(f"Chat ID: {data.get('chat_id')}")

            # Try to parse food_log widget
            try:
                # Response might start with JSON widget or be pure text
                clean = response_text.split("\n\u26a0")[0].strip()  # Remove warning suffix
                widget = json.loads(clean)
                if isinstance(widget, dict) and widget.get("type") == "food_log":
                    print(f"\n--- FOOD LOG WIDGET ---")
                    print(f"Items saved: {len(widget.get('items', []))}")
                    for item in widget.get("items", []):
                        print(f"  + {item.get('product', '?')}: {item.get('grams', '?')}г = "
                              f"{item.get('calories', '?')} ккал "
                              f"(Б:{item.get('protein', '?')}, Ж:{item.get('fats', '?')}, "
                              f"У:{item.get('carbs', '?')})")
                    print(f"  Sum totals: {widget.get('totals', {})}")
                    t = widget.get('today_totals', {})
                    print(f"  Today totals: {t.get('calories')} ккал, "
                          f"Б:{t.get('protein')}г, Ж:{t.get('fats')}г, "
                          f"У:{t.get('carbs')}г ({t.get('items_count')} items)")
                    if widget.get('profile'):
                        p = widget['profile']
                        print(f"  Profile targets: {p.get('calorie_target')} ккал, "
                              f"Б:{p.get('protein_target')}г, Ж:{p.get('fats_target')}г, "
                              f"У:{p.get('carbs_target')}г")

                # Print warning/missing suffix if present
                if "\n\u26a0" in response_text:
                    warning = response_text.split("\n\u26a0", 1)[1]
                    print(f"\n  WARNING/QUESTION:{warning}")
            except (json.JSONDecodeError, TypeError, AttributeError):
                print(f"RESPONSE: {response_text[:800]}")

    except urllib.error.HTTPError as e:
        print(f"HTTP ERROR {e.code}: {e.read().decode('utf-8')[:500]}")
    except Exception as e:
        print(f"ERROR: {e}")


def check_db():
    """Check what's in the DB."""
    print(f"\n--- CHECKING DB ---")
    try:
        with urllib.request.urlopen(
            f"{BASE_URL}/user/{USER_ID}/food-by-date?date=2026-06-29", timeout=30
        ) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            totals = data.get("totals", {})
            print(f"Items in DB: {totals.get('items_count', 0)}")
            print(f"Totals: {totals.get('calories')} ккал, "
                  f"Б:{totals.get('protein')}г, Ж:{totals.get('fats')}г, "
                  f"У:{totals.get('carbs')}г")
            for item in data.get("items", []):
                print(f"  [{item['id']}] {item.get('product_name', 'N/A'):25s} | "
                      f"{item.get('grams')}г | {item.get('calories')} ккал | "
                      f"Б:{item.get('protein')} Ж:{item.get('fats')} У:{item.get('carbs')} | "
                      f"{item.get('meal_type', '?')}")
    except Exception as e:
        print(f"ERROR: {e}")


if __name__ == "__main__":
    print("=" * 60)
    print("FOOD CONSUMPTION FLOW TEST")
    print(f"API: {BASE_URL}")
    print("=" * 60)

    # Show initial state
    check_db()

    # Test 1: Product WITHOUT explicit grams — agent should estimate or ask
    test_chat(
        "съел шоколадный пончик из пятерочки",
        "Single product WITHOUT grams — agent estimates portion size"
    )

    time.sleep(2)

    # Test 2: Multiple items WITH explicit grams
    test_chat(
        "Съел 300 грамм вареных макарон, 200 грамм вареной грудки и запил колой без сахара 0.5",
        "Multiple items WITH explicit grams"
    )

    time.sleep(2)

    # Test 3: Product that's hard to find KBJU for — should ask client
    test_chat(
        "Выпил стакан улуна с мёдом",
        "Product with ambiguous KBJU — should ask for clarification"
    )

    time.sleep(2)

    # Show final state
    check_db()

    print("\n" + "=" * 60)
    print("TEST COMPLETE")
    print("=" * 60)