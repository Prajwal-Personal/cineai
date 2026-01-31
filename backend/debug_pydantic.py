
import sys
import os
import traceback

# Add the current directory to sys.path to allow importing from 'app'
sys.path.append(os.getcwd())

print("--- Detailed Diagnostic Start ---")

modules_to_test = [
    "app.core.config",
    "app.db.session",
    "app.models.database",
    "app.schemas.base",
    "app.schemas.models",
    "app.api.deps",
    "app.services.semantic_search_service",
    "app.api.api_v1.api",
    "app.main"
]

for module_name in modules_to_test:
    print(f"Testing import: {module_name}...")
    try:
        __import__(module_name)
        print(f"OK: Successfully imported {module_name}")
    except Exception as e:
        print(f"ERROR: in {module_name}: {type(e).__name__}: {e}")
        # Capture traceback to string for safer printing
        tb_str = traceback.format_exc()
        # Ensure ASCII for terminal output
        print(tb_str.encode('ascii', 'replace').decode('ascii'))
        print("-" * 40)

print("--- Detailed Diagnostic End ---")
