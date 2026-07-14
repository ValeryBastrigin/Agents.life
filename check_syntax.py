"""Check syntax of all billing-related files using py_compile."""
import py_compile, sys

files = [
    "backend/src/billing/__init__.py",
    "backend/src/billing/constants.py",
    "backend/src/billing/pricing_config.py",
    "backend/src/billing/calculator.py",
    "backend/src/billing/plans.py",
    "backend/src/billing/router.py",
    "backend/src/models.py",
    "backend/main.py",
    "backend/src/orchestrator/router.py",
    "frontend/src/components/BillingPlans.jsx",
    "frontend/src/components/PaywallModal.jsx",
    "frontend/src/pages/Profile.jsx",
    "frontend/src/App.jsx",
]

errors = []
for f in files:
    try:
        if f.endswith(".py"):
            py_compile.compile(f, doraise=True)
            print(f"OK  {f}")
        elif f.endswith(".jsx") or f.endswith(".js"):
            # Can't easily syntax-check JSX without node, note as skipped
            print(f"SKIP {f} (not Python)")
    except py_compile.PyCompileError as e:
        errors.append(f)
        print(f"ERR {f}: {e}")
    except FileNotFoundError:
        errors.append(f)
        print(f"MISS {f}")

if errors:
    print("\nERRORS:")
    for e in errors:
        print(f"  - {e}")
    sys.exit(1)
else:
    print("\nAll checked files OK")