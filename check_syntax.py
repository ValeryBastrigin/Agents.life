import py_compile
files = [
    'backend/src/agents/streaming.py',
    'backend/src/agents/dietitian_agent.py',
    'backend/src/agents/secretary_agent.py',
    'backend/src/agents/psychologist_agent.py',
    'backend/src/agents/accountant_agent.py',
    'backend/src/orchestrator/router.py',
]
for f in files:
    try:
        py_compile.compile(f, doraise=True)
        print(f'OK: {f}')
    except py_compile.PyCompileError as e:
        print(f'FAIL: {f}: {e}')